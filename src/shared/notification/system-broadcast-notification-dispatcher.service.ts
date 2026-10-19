import { Inject, Injectable } from '@nestjs/common';
import type { LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { NotificationType } from '../../core/domain/enums';
import { LOGGER_TOKEN } from '../logger/logger.service';

type BroadcastIntent = {
  id: string;
  broadcastId: string;
  recipientId: string;
};

type DeliveryOutcome = 'accepted' | 'suppressed' | 'not_processing' | 'retrying' | 'retry_failed';

type DispatchSummary = {
  ok: boolean;
  recovered: number;
  dead: number;
  claimed: number;
  accepted: number;
  suppressed: number;
  retrying: number;
  retryFailed: number;
  notProcessing: number;
};

const EMPTY_SUMMARY: DispatchSummary = {
  ok: true,
  recovered: 0,
  dead: 0,
  claimed: 0,
  accepted: 0,
  suppressed: 0,
  retrying: 0,
  retryFailed: 0,
  notProcessing: 0,
};

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const recordField = (
  value: unknown,
  field: string,
): Record<string, unknown> | undefined => {
  if (!isRecord(value)) return undefined;
  const result = value[field];
  return isRecord(result) ? result : undefined;
};

@Injectable()
export class SystemBroadcastNotificationDispatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<DispatchSummary> {
    const recovered = await this.dataSource
      .query<Array<{ status: 'retry' | 'dead' }>>(
        `UPDATE system_notification_broadcast_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = CASE WHEN attempt_count >= 8 THEN available_at ELSE now() END,
             locked_at = NULL,
             last_error_code = CASE WHEN attempt_count >= 8
               THEN 'attempt_limit_reached' ELSE 'stale_processing_recovered' END,
             updated_at = now()
         WHERE status = 'processing'
           AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
         RETURNING status`,
      )
      .then(
        rows => ({ kind: 'recovered' as const, rows }),
        cause => ({ kind: 'failed' as const, cause }),
      );
    if (recovered.kind === 'failed') {
      this.logger.error(
        `System broadcast notification recovery failed: ${errorMessage(recovered.cause)}`,
      );
      return { ...EMPTY_SUMMARY, ok: false };
    }
    const recoveredCount = recovered.rows.filter(row => row.status === 'retry').length;
    const deadCount = recovered.rows.filter(row => row.status === 'dead').length;

    const claimed = await this.dataSource
      .query<BroadcastIntent[]>(
        `
        WITH due AS (
          SELECT id
          FROM system_notification_broadcast_intent
          WHERE status IN ('pending', 'retry') AND available_at <= now()
          ORDER BY available_at, created_at
          LIMIT 25
          FOR UPDATE SKIP LOCKED
        )
        UPDATE system_notification_broadcast_intent intent
        SET status = 'processing', attempt_count = intent.attempt_count + 1,
            locked_at = now(), updated_at = now()
        FROM due
        WHERE intent.id = due.id
        RETURNING intent.id, intent.broadcast_id AS "broadcastId",
          intent.recipient_id AS "recipientId"
      `,
      )
      .then(
        intents => ({ kind: 'claimed' as const, intents }),
        cause => ({ kind: 'failed' as const, cause }),
      );

    if (claimed.kind === 'failed') {
      this.logger.error(
        `System broadcast notification claim failed: ${errorMessage(claimed.cause)}`,
      );
      return { ...EMPTY_SUMMARY, ok: false, recovered: recoveredCount, dead: deadCount };
    }

    const outcomes: DeliveryOutcome[] = [];
    for (const intent of claimed.intents) {
      outcomes.push(await this.deliver(intent));
    }
    const summary: DispatchSummary = {
      ok:
        deadCount === 0 &&
        !outcomes.includes('retrying') &&
        !outcomes.includes('retry_failed') &&
        !outcomes.includes('not_processing'),
      recovered: recoveredCount,
      dead: deadCount,
      claimed: claimed.intents.length,
      accepted: outcomes.filter(outcome => outcome === 'accepted').length,
      suppressed: outcomes.filter(outcome => outcome === 'suppressed').length,
      retrying: outcomes.filter(outcome => outcome === 'retrying').length,
      retryFailed: outcomes.filter(outcome => outcome === 'retry_failed').length,
      notProcessing: outcomes.filter(outcome => outcome === 'not_processing').length,
    };
    this.logger.log(
      `System broadcast notification dispatch completed: ${JSON.stringify(summary)}`,
    );
    return summary;
  }

  private async deliver(intent: BroadcastIntent): Promise<DeliveryOutcome> {
    const delivery = await this.dataSource
      .transaction(async manager => {
        const rows = await manager.query<
          Array<{
            organizationId: string;
            title: string;
            body: string;
            actorUserId: string;
            ownerOrganizationId: string | null;
            isActive: boolean;
            notification_preferences: unknown;
          }>
        >(
          `SELECT broadcast.organization_id AS "organizationId",
                  broadcast.title, broadcast.body,
                  broadcast.actor_user_id AS "actorUserId",
                  recipient."organizationId" AS "ownerOrganizationId",
                  recipient."isActive", recipient.notification_preferences
           FROM system_notification_broadcast broadcast
           JOIN "user" recipient ON recipient.id = $2::uuid
           WHERE broadcast.id = $1::uuid
           FOR SHARE OF broadcast, recipient`,
          [intent.broadcastId, intent.recipientId],
        );
        const broadcast = rows[0];
        if (!broadcast || !broadcast.isActive) {
          const updated = await this.setStatus(manager, intent.id, 'suppressed');
          return updated ? ('suppressed' as const) : ('not_processing' as const);
        }

        const isOwner =
          broadcast.ownerOrganizationId === broadcast.organizationId;
        const members = isOwner
          ? [{ id: intent.recipientId }]
          : await manager.query<Array<{ id: string }>>(
              `SELECT id FROM organization_member
               WHERE organization_id = $1::uuid AND user_id = $2::uuid
               FOR SHARE`,
              [broadcast.organizationId, intent.recipientId],
            );
        const channels = recordField(
          broadcast.notification_preferences,
          'channels',
        );
        const events = recordField(
          broadcast.notification_preferences,
          'events',
        );
        if (
          members.length === 0 ||
          channels?.in_app === false ||
          events?.system === false
        ) {
          const updated = await this.setStatus(manager, intent.id, 'suppressed');
          return updated ? ('suppressed' as const) : ('not_processing' as const);
        }

        const updated = await this.setStatus(manager, intent.id, 'accepted');
        if (!updated) return 'not_processing' as const;

        const dedupKey = `system_broadcast:${intent.broadcastId}:${intent.recipientId}`;
        await manager.query(
          `WITH eligible_dedup AS (
             INSERT INTO notification_deduplication (user_id, type, dedup_key)
             VALUES ($1::uuid, $2, $3)
             ON CONFLICT (user_id, type, dedup_key) DO UPDATE
             SET created_at = now(), expires_at = now() + interval '1 hour'
             WHERE notification_deduplication.expires_at <= now()
             RETURNING 1
           )
           INSERT INTO notification (user_id, type, title, body, link, data)
           SELECT $1::uuid, $2, $4, $5, '/dashboard/notifications', $6::jsonb
           FROM eligible_dedup
           WHERE NOT EXISTS (
             SELECT 1 FROM notification
             WHERE user_id = $1::uuid AND type = $2
               AND data->>'dedupKey' = $3
               AND created_at > now() - interval '1 hour'
           )`,
          [
            intent.recipientId,
            NotificationType.SYSTEM,
            dedupKey,
            broadcast.title,
            broadcast.body,
            JSON.stringify({
              broadcastId: intent.broadcastId,
              organizationId: broadcast.organizationId,
              actorUserId: broadcast.actorUserId,
              dedupKey,
            }),
          ],
        );
        return 'accepted' as const;
      })
      .then(
        result => ({ kind: 'delivered' as const, result }),
        cause => ({ kind: 'failed' as const, cause }),
      );

    if (delivery.kind === 'delivered') return delivery.result;
    this.logger.error(
      `System broadcast notification delivery failed for ${intent.id} (${intent.broadcastId}): ${errorMessage(delivery.cause)}`,
    );
    const updated = await this.dataSource
      .query<Array<{ status: 'retry' | 'dead' }>>(
        `UPDATE system_notification_broadcast_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
             locked_at = NULL, last_error_code = 'delivery_failed', updated_at = now()
         WHERE id = $1::uuid AND status = 'processing'
         RETURNING status`,
        [intent.id],
      )
      .then(
        rows => ({ kind: 'updated' as const, rows }),
        cause => ({ kind: 'failed' as const, cause }),
      );
    if (updated.kind === 'failed') {
      this.logger.error(
        `System broadcast notification retry update failed for ${intent.id}: ${errorMessage(updated.cause)}`,
      );
      return 'retry_failed';
    }
    if (updated.rows.length === 0) {
      this.logger.error(
        `System broadcast notification retry update skipped for ${intent.id}: intent was no longer processing`,
      );
      return 'retry_failed';
    }
    return updated.rows[0].status === 'dead' ? 'retry_failed' : 'retrying';
  }

  private async setStatus(
    manager: EntityManager,
    intentId: string,
    status: 'accepted' | 'suppressed',
  ): Promise<boolean> {
    const rows = await manager.query<Array<{ id: string }>>(
      `UPDATE system_notification_broadcast_intent
       SET status = $2, locked_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'processing'
       RETURNING id`,
      [intentId, status],
    );
    return rows.length > 0;
  }
}

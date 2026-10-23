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

type SuppressionReason =
  | 'broadcast_or_recipient_missing'
  | 'recipient_inactive'
  | 'organization_membership_missing'
  | 'in_app_channel_disabled'
  | 'system_event_disabled';

type DeliveryOutcome =
  | { intentId: string; broadcastId: string; status: 'accepted' }
  | {
      intentId: string;
      broadcastId: string;
      status: 'suppressed';
      reason: SuppressionReason;
    }
  | {
      intentId: string;
      broadcastId: string;
      status: 'not_processing';
    }
  | {
      intentId: string;
      broadcastId: string;
      status: 'retrying' | 'retry_failed';
      errorCode: string;
    };

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
  outcomes: DeliveryOutcome[];
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
  outcomes: [],
};

const errorMessage = (cause: unknown): string =>
  cause instanceof Error ? cause.message : String(cause);

const databaseErrorCode = (cause: unknown): string => {
  if (!isRecord(cause)) return 'delivery_failed';
  const driverError = recordField(cause, 'driverError');
  const code = cause.code ?? driverError?.code;
  return typeof code === 'string' && /^[A-Z0-9_]{1,80}$/.test(code)
    ? code
    : 'delivery_failed';
};

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

  @Cron(CronExpression.EVERY_MINUTE, {
    disabled:
      process.env.NODE_ENV === 'production' || process.env.VERCEL === '1',
  })
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
        (cause: unknown) => ({ kind: 'failed' as const, cause }),
      );
    if (recovered.kind === 'failed') {
      this.logger.error(
        `System broadcast notification recovery failed: ${errorMessage(recovered.cause)}`,
      );
      return { ...EMPTY_SUMMARY, ok: false };
    }
    const recoveredCount = recovered.rows.filter(
      row => row.status === 'retry',
    ).length;
    const deadCount = recovered.rows.filter(
      row => row.status === 'dead',
    ).length;

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
        (cause: unknown) => ({ kind: 'failed' as const, cause }),
      );

    if (claimed.kind === 'failed') {
      this.logger.error(
        `System broadcast notification claim failed: ${errorMessage(claimed.cause)}`,
      );
      return {
        ...EMPTY_SUMMARY,
        ok: false,
        recovered: recoveredCount,
        dead: deadCount,
      };
    }

    const outcomes: DeliveryOutcome[] = [];
    for (const intent of claimed.intents) {
      outcomes.push(await this.deliver(intent));
    }
    const summary: DispatchSummary = {
      ok:
        deadCount === 0 &&
        !outcomes.some(outcome => outcome.status === 'retrying') &&
        !outcomes.some(outcome => outcome.status === 'retry_failed') &&
        !outcomes.some(outcome => outcome.status === 'not_processing'),
      recovered: recoveredCount,
      dead: deadCount,
      claimed: claimed.intents.length,
      accepted: outcomes.filter(outcome => outcome.status === 'accepted')
        .length,
      suppressed: outcomes.filter(outcome => outcome.status === 'suppressed')
        .length,
      retrying: outcomes.filter(outcome => outcome.status === 'retrying')
        .length,
      retryFailed: outcomes.filter(outcome => outcome.status === 'retry_failed')
        .length,
      notProcessing: outcomes.filter(
        outcome => outcome.status === 'not_processing',
      ).length,
      outcomes,
    };
    this.logger.log(
      `System broadcast notification dispatch completed: ${JSON.stringify(summary)}`,
    );
    return summary;
  }

  async dispatchIntent(intentId: string): Promise<
    | { intentId: string; status: 'not_found' }
    | { intentId: string; status: 'not_ready'; currentStatus: string }
    | { intentId: string; status: 'dead' }
    | DeliveryOutcome
    | { intentId: string; status: 'failed'; stage: 'recovery' | 'claim' }
  > {
    const recovered = await this.dataSource
      .query<Array<{ status: 'retry' | 'dead' }>>(
        `UPDATE system_notification_broadcast_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = CASE WHEN attempt_count >= 8 THEN available_at ELSE now() END,
             locked_at = NULL,
             last_error_code = CASE WHEN attempt_count >= 8
               THEN 'attempt_limit_reached' ELSE 'stale_processing_recovered' END,
             updated_at = now()
         WHERE id = $1::uuid
           AND status = 'processing'
           AND (locked_at IS NULL OR locked_at < now() - interval '5 minutes')
         RETURNING status`,
        [intentId],
      )
      .then(
        rows => ({ kind: 'recovered' as const, rows }),
        (cause: unknown) => ({ kind: 'failed' as const, cause }),
      );
    if (recovered.kind === 'failed') {
      this.logger.error(
        `System broadcast notification recovery failed for ${intentId}: ${errorMessage(recovered.cause)}`,
      );
      return { intentId, status: 'failed', stage: 'recovery' };
    }
    if (recovered.rows[0]?.status === 'dead') {
      return { intentId, status: 'dead' };
    }

    const claimed = await this.dataSource
      .query<BroadcastIntent[]>(
        `UPDATE system_notification_broadcast_intent
         SET status = 'processing', attempt_count = attempt_count + 1,
             locked_at = now(), updated_at = now()
         WHERE id = $1::uuid
           AND status IN ('pending', 'retry')
           AND available_at <= now()
         RETURNING id, broadcast_id AS "broadcastId",
           recipient_id AS "recipientId"`,
        [intentId],
      )
      .then(
        intents => ({ kind: 'claimed' as const, intents }),
        (cause: unknown) => ({ kind: 'failed' as const, cause }),
      );
    if (claimed.kind === 'failed') {
      this.logger.error(
        `System broadcast notification claim failed for ${intentId}: ${errorMessage(claimed.cause)}`,
      );
      return { intentId, status: 'failed', stage: 'claim' };
    }

    const intent = claimed.intents[0];
    if (!intent) {
      const current = await this.dataSource
        .query<Array<{ status: string }>>(
          `SELECT status FROM system_notification_broadcast_intent
           WHERE id = $1::uuid`,
          [intentId],
        )
        .then(
          rows => ({ kind: 'found' as const, rows }),
          (cause: unknown) => ({ kind: 'failed' as const, cause }),
        );
      if (current.kind === 'failed') {
        this.logger.error(
          `System broadcast notification state lookup failed for ${intentId}: ${errorMessage(current.cause)}`,
        );
        return { intentId, status: 'failed', stage: 'claim' };
      }
      const currentStatus = current.rows[0]?.status;
      return currentStatus
        ? { intentId, status: 'not_ready', currentStatus }
        : { intentId, status: 'not_found' };
    }

    const outcome = await this.deliver(intent);
    this.logger.log(
      `System broadcast notification targeted dispatch: ${JSON.stringify(outcome)}`,
    );
    return outcome;
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
          const reason: SuppressionReason = broadcast
            ? 'recipient_inactive'
            : 'broadcast_or_recipient_missing';
          const updated = await this.setStatus(
            manager,
            intent.id,
            'suppressed',
            reason,
          );
          return updated
            ? ({
                intentId: intent.id,
                broadcastId: intent.broadcastId,
                status: 'suppressed',
                reason,
              } as const)
            : ({
                intentId: intent.id,
                broadcastId: intent.broadcastId,
                status: 'not_processing',
              } as const);
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
        const suppressionReason: SuppressionReason | undefined =
          members.length === 0
            ? 'organization_membership_missing'
            : channels?.in_app === false
              ? 'in_app_channel_disabled'
              : events?.system === false
                ? 'system_event_disabled'
                : undefined;
        if (suppressionReason) {
          const updated = await this.setStatus(
            manager,
            intent.id,
            'suppressed',
            suppressionReason,
          );
          return updated
            ? ({
                intentId: intent.id,
                broadcastId: intent.broadcastId,
                status: 'suppressed',
                reason: suppressionReason,
              } as const)
            : ({
                intentId: intent.id,
                broadcastId: intent.broadcastId,
                status: 'not_processing',
              } as const);
        }

        const updated = await this.setStatus(manager, intent.id, 'accepted');
        if (!updated) {
          return {
            intentId: intent.id,
            broadcastId: intent.broadcastId,
            status: 'not_processing',
          } as const;
        }

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
        return {
          intentId: intent.id,
          broadcastId: intent.broadcastId,
          status: 'accepted',
        } as const;
      })
      .then(
        result => ({ kind: 'delivered' as const, result }),
        (cause: unknown) => ({ kind: 'failed' as const, cause }),
      );

    if (delivery.kind === 'delivered') return delivery.result;
    const failureCode = databaseErrorCode(delivery.cause);
    this.logger.error(
      `System broadcast notification delivery failed for ${intent.id} (${intent.broadcastId}) [${failureCode}]: ${errorMessage(delivery.cause)}`,
    );
    const updated = await this.dataSource
      .query<Array<{ status: 'retry' | 'dead' }>>(
        `UPDATE system_notification_broadcast_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
             locked_at = NULL, last_error_code = $2, updated_at = now()
         WHERE id = $1::uuid AND status = 'processing'
         RETURNING status`,
        [intent.id, failureCode],
      )
      .then(
        rows => ({ kind: 'updated' as const, rows }),
        (cause: unknown) => ({ kind: 'failed' as const, cause }),
      );
    if (updated.kind === 'failed') {
      this.logger.error(
        `System broadcast notification retry update failed for ${intent.id}: ${errorMessage(updated.cause)}`,
      );
      return {
        intentId: intent.id,
        broadcastId: intent.broadcastId,
        status: 'retry_failed',
        errorCode: 'retry_state_update_failed',
      };
    }
    if (updated.rows.length === 0) {
      this.logger.error(
        `System broadcast notification retry update skipped for ${intent.id}: intent was no longer processing`,
      );
      return {
        intentId: intent.id,
        broadcastId: intent.broadcastId,
        status: 'retry_failed',
        errorCode: 'intent_not_processing',
      };
    }
    return {
      intentId: intent.id,
      broadcastId: intent.broadcastId,
      status: updated.rows[0].status === 'dead' ? 'retry_failed' : 'retrying',
      errorCode: failureCode,
    };
  }

  private async setStatus(
    manager: EntityManager,
    intentId: string,
    status: 'accepted' | 'suppressed',
    errorCode: SuppressionReason | null = null,
  ): Promise<boolean> {
    const rows = await manager.query<Array<{ id: string }>>(
      `UPDATE system_notification_broadcast_intent
       SET status = $2, locked_at = NULL, last_error_code = $3, updated_at = now()
       WHERE id = $1::uuid AND status = 'processing'
       RETURNING id`,
      [intentId, status, errorCode],
    );
    return rows.length > 0;
  }
}

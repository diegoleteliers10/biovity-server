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
  async dispatch(): Promise<void> {
    const recovered = await this.dataSource
      .query(
        `UPDATE system_notification_broadcast_intent
         SET status = 'dead', locked_at = NULL,
             last_error_code = 'attempt_limit_reached', updated_at = now()
         WHERE status = 'processing' AND attempt_count >= 8
           AND locked_at < now() - interval '5 minutes'`,
      )
      .then(
        () => 'ok' as const,
        () => 'failed' as const,
      );
    if (recovered === 'failed') {
      this.logger.error('system broadcast notification recovery failed');
      return;
    }

    const claimed = await this.dataSource
      .query<BroadcastIntent[]>(
        `
        WITH due AS (
          SELECT id
          FROM system_notification_broadcast_intent
          WHERE ((status IN ('pending', 'retry') AND available_at <= now())
             OR (status = 'processing' AND attempt_count < 8
               AND locked_at < now() - interval '5 minutes'))
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
        intents => ({ intents }),
        () => ({ intents: null }),
      );

    if (!claimed.intents) {
      this.logger.error('system broadcast notification claim failed');
      return;
    }

    for (const intent of claimed.intents) await this.deliver(intent);
  }

  private async deliver(intent: BroadcastIntent): Promise<void> {
    const outcome = await this.dataSource
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
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
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
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const processing = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM system_notification_broadcast_intent
           WHERE id = $1::uuid AND status = 'processing'
           FOR UPDATE`,
          [intent.id],
        );
        if (processing.length === 0) return 'not_processing' as const;

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
        await this.setStatus(manager, intent.id, 'accepted');
        return 'accepted' as const;
      })
      .then(
        result => ({ kind: result }),
        () => ({ kind: 'failed' as const }),
      );

    if (outcome.kind !== 'failed') return;
    this.logger.error(
      `System broadcast notification delivery failed for ${intent.id}`,
    );
    const updated = await this.dataSource
      .query(
        `UPDATE system_notification_broadcast_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
             locked_at = NULL, last_error_code = 'delivery_failed', updated_at = now()
         WHERE id = $1::uuid AND status = 'processing'`,
        [intent.id],
      )
      .then(
        () => 'updated' as const,
        () => 'failed' as const,
      );
    if (updated === 'failed') {
      this.logger.error(
        `System broadcast notification retry update failed for ${intent.id}`,
      );
    }
  }

  private async setStatus(
    manager: EntityManager,
    intentId: string,
    status: 'accepted' | 'suppressed',
  ): Promise<void> {
    await manager.query(
      `UPDATE system_notification_broadcast_intent
       SET status = $2, locked_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'processing'`,
      [intentId, status],
    );
  }
}

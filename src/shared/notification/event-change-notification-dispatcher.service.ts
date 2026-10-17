import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { NotificationType } from '../../core/domain/enums';
import { LOGGER_TOKEN } from '../logger/logger.service';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

type EventChangeIntent = {
  id: string;
  eventId: string;
  recipientId: string;
  action: 'updated' | 'cancelled';
  eventTitle: string;
  changeHistoryId: string;
};

@Injectable()
export class EventChangeNotificationDispatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    const claimed = await this.dataSource
      .query<EventChangeIntent[]>(
        `UPDATE event_change_notification_intent
         SET status = 'dead', locked_at = NULL, updated_at = now()
         WHERE attempt_count >= 8
           AND (status IN ('pending', 'retry')
             OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
         RETURNING id`,
      )
      .then(
        () =>
          this.dataSource
            .query<EventChangeIntent[]>(
              `WITH ready AS (
               SELECT id FROM event_change_notification_intent
               WHERE attempt_count < 8
                 AND ((status IN ('pending', 'retry') AND available_at <= now())
                   OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
               ORDER BY available_at, created_at
               FOR UPDATE SKIP LOCKED LIMIT 20
             )
             UPDATE event_change_notification_intent intent
             SET status = 'processing', attempt_count = attempt_count + 1,
                 locked_at = now(), updated_at = now()
             FROM ready WHERE intent.id = ready.id
             RETURNING intent.id, intent.event_id AS "eventId",
               intent.recipient_id AS "recipientId", intent.action,
               intent.event_title AS "eventTitle",
               intent.change_history_id AS "changeHistoryId"`,
            )
            .then(
              intents => ({ kind: 'claimed' as const, intents }),
              () => ({ kind: 'error' as const }),
            ),
        () => ({ kind: 'error' as const }),
      );
    if (claimed.kind === 'error') {
      this.logger.error('Event change notification claim failed');
      return;
    }

    for (const intent of claimed.intents) await this.deliver(intent);
  }

  private async deliver(intent: EventChangeIntent): Promise<void> {
    const delivered = await this.dataSource
      .transaction(async manager => {
        const rows = await manager.query<
          Array<{ notification_preferences: unknown }>
        >(
          'SELECT notification_preferences FROM "user" WHERE id = $1 FOR SHARE',
          [intent.recipientId],
        );
        const preferences = rows[0]?.notification_preferences;
        const channels = this.recordField(preferences, 'channels');
        const events = this.recordField(preferences, 'events');
        if (
          rows.length === 0 ||
          channels?.in_app === false ||
          events?.interview === false
        ) {
          await manager.query(
            `UPDATE event_change_notification_intent
             SET status = 'suppressed', locked_at = NULL, updated_at = now()
             WHERE id = $1 AND status = 'processing'`,
            [intent.id],
          );
          return 'suppressed' as const;
        }

        const cancelled = intent.action === 'cancelled';
        const dedupKey = `event:${intent.eventId}:history:${intent.changeHistoryId}`;
        await manager.query(
          `WITH eligible_dedup AS (
             INSERT INTO notification_deduplication (user_id, type, dedup_key)
             VALUES ($1, $2, $7)
             ON CONFLICT (user_id, type, dedup_key) DO UPDATE
             SET created_at = now(), expires_at = now() + interval '1 hour'
             WHERE notification_deduplication.expires_at <= now()
             RETURNING 1
           )
           INSERT INTO notification (user_id, type, title, body, link, data)
           SELECT $1, $2, $3, $4, $5, $6 FROM eligible_dedup
           WHERE NOT EXISTS (
             SELECT 1 FROM notification
             WHERE user_id = $1 AND type = $2
               AND data->>'dedupKey' = $7
               AND created_at > now() - interval '1 hour'
           )`,
          [
            intent.recipientId,
            NotificationType.INTERVIEW,
            cancelled ? 'Evento cancelado' : 'Evento actualizado',
            cancelled
              ? `“${intent.eventTitle}” fue cancelado`
              : `“${intent.eventTitle}” fue actualizado`,
            '/dashboard/calendar',
            JSON.stringify({ eventId: intent.eventId, dedupKey }),
            dedupKey,
          ],
        );
        await manager.query(
          `UPDATE event_change_notification_intent
           SET status = 'accepted', locked_at = NULL, last_error_code = NULL,
               updated_at = now()
           WHERE id = $1 AND status = 'processing'`,
          [intent.id],
        );
        return 'accepted' as const;
      })
      .then(
        result => ({ kind: result }),
        () => ({ kind: 'failed' as const }),
      );

    if (delivered.kind !== 'failed') return;
    this.logger.error(
      `Event change notification delivery failed for ${intent.id}`,
    );
    await this.dataSource
      .query(
        `UPDATE event_change_notification_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
             locked_at = NULL, last_error_code = 'delivery_failed', updated_at = now()
         WHERE id = $1 AND status = 'processing'`,
        [intent.id],
      )
      .then(
        () => undefined,
        () => {
          this.logger.error(
            `Event change notification retry update failed for ${intent.id}`,
          );
          return undefined;
        },
      );
  }

  private recordField(
    value: unknown,
    field: string,
  ): Record<string, unknown> | undefined {
    if (!isRecord(value)) return undefined;
    const result = value[field];
    return isRecord(result) ? result : undefined;
  }
}

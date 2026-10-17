import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import {
  EventStatus,
  EventType,
  NotificationType,
} from '../../core/domain/enums';
import { LOGGER_TOKEN } from '../logger/logger.service';

type InterviewReminderIntent = {
  id: string;
  eventId: string;
  participantId: string;
  recipientId: string;
  scheduledStartAt: Date;
};

type RecordValue = Record<string, unknown>;

const isRecord = (value: unknown): value is RecordValue =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const recordField = (
  value: unknown,
  field: string,
): RecordValue | undefined => {
  if (!isRecord(value)) return undefined;
  const result = value[field];
  return isRecord(result) ? result : undefined;
};

@Injectable()
export class InterviewReminderNotificationDispatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    const claimed = await this.dataSource
      .query<InterviewReminderIntent[]>(
        `UPDATE interview_reminder_notification_intent
         SET status = 'dead', locked_at = NULL, updated_at = now()
         WHERE attempt_count >= 8
           AND (status IN ('pending', 'retry')
             OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))`,
      )
      .then(
        () =>
          this.dataSource
            .query<InterviewReminderIntent[]>(
              `WITH ready AS (
                 SELECT intent.id
                 FROM interview_reminder_notification_intent intent
                 WHERE intent.attempt_count < 8
                   AND ((intent.status IN ('pending', 'retry') AND intent.available_at <= now())
                     OR (intent.status = 'processing' AND intent.locked_at < now() - interval '5 minutes'))
                 ORDER BY intent.available_at, intent.created_at
                 FOR UPDATE SKIP LOCKED LIMIT 20
               )
               UPDATE interview_reminder_notification_intent intent
               SET status = 'processing', attempt_count = intent.attempt_count + 1,
                   locked_at = now(), updated_at = now()
               FROM ready
               WHERE intent.id = ready.id
               RETURNING intent.id, intent.event_id AS "eventId",
                 intent.participant_id AS "participantId",
                 intent.scheduled_start_at AS "scheduledStartAt",
                 (SELECT participant.user_id FROM event_participant participant
                  WHERE participant.id = intent.participant_id) AS "recipientId"`,
            )
            .then(
              intents => ({ kind: 'claimed' as const, intents }),
              () => ({ kind: 'error' as const }),
            ),
        () => ({ kind: 'error' as const }),
      );
    if (claimed.kind === 'error') {
      this.logger.error('Interview reminder claim failed');
      return;
    }

    for (const intent of claimed.intents) await this.deliver(intent);
  }

  private async deliver(intent: InterviewReminderIntent): Promise<void> {
    const outcome = await this.dataSource
      .transaction(async manager => {
        const events = await manager.query<
          Array<{
            id: string;
            title: string;
            startAt: Date;
            timeZone: string;
            status: string;
            type: string;
          }>
        >(
          `SELECT id, title, "startAt", "timeZone", status, type
           FROM event WHERE id = $1::uuid FOR SHARE`,
          [intent.eventId],
        );
        const event = events[0];
        const lockedIntents = await manager.query<Array<{ status: string }>>(
          `SELECT status FROM interview_reminder_notification_intent
           WHERE id = $1::uuid FOR UPDATE`,
          [intent.id],
        );
        if (lockedIntents[0]?.status !== 'processing') {
          return 'suppressed' as const;
        }
        if (
          !event ||
          event.type !== String(EventType.INTERVIEW) ||
          event.status !== String(EventStatus.SCHEDULED) ||
          event.startAt.getTime() !==
            new Date(intent.scheduledStartAt).getTime() ||
          event.startAt.getTime() <= Date.now()
        ) {
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const attendees = await manager.query<
          Array<{
            status: string;
            isActive: boolean;
            notification_preferences: unknown;
          }>
        >(
          `SELECT participant.status, attendee."isActive",
                  attendee.notification_preferences
           FROM event_participant participant
           JOIN "user" attendee ON attendee.id = participant.user_id
           WHERE participant.id = $1::uuid AND participant.event_id = $2::uuid
             AND attendee.id = $3::uuid FOR SHARE OF participant, attendee`,
          [intent.participantId, intent.eventId, intent.recipientId],
        );
        const attendee = attendees[0];
        const channels = recordField(
          attendee?.notification_preferences,
          'channels',
        );
        const preferences = recordField(
          attendee?.notification_preferences,
          'events',
        );
        if (
          !attendee ||
          !attendee.isActive ||
          attendee.status === 'declined' ||
          channels?.in_app === false ||
          preferences?.interview === false
        ) {
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const localTimes = await manager.query<Array<{ startAtLocal: string }>>(
          `SELECT TO_CHAR($1::timestamptz AT TIME ZONE $2, 'YYYY-MM-DD HH24:MI') AS "startAtLocal"`,
          [event.startAt, event.timeZone],
        );
        const startAtLocal =
          localTimes[0]?.startAtLocal ?? event.startAt.toISOString();
        const dedupKey = `interview-reminder:${intent.id}`;
        await manager.query(
          `WITH eligible_dedup AS (
             INSERT INTO notification_deduplication (user_id, type, dedup_key)
             VALUES ($1::uuid, $2, $7)
             ON CONFLICT (user_id, type, dedup_key) DO UPDATE
             SET created_at = now(), expires_at = now() + interval '30 days'
             WHERE notification_deduplication.expires_at <= now()
             RETURNING 1
           )
           INSERT INTO notification (user_id, type, title, body, link, data)
           SELECT $1::uuid, $2, $3, $4, $5, $6 FROM eligible_dedup
           WHERE NOT EXISTS (
             SELECT 1 FROM notification
             WHERE user_id = $1::uuid AND type = $2
               AND data->>'dedupKey' = $7
           )`,
          [
            intent.recipientId,
            NotificationType.INTERVIEW,
            'Entrevista próxima',
            `${event.title} · ${startAtLocal} (${event.timeZone})`,
            '/dashboard/calendar',
            JSON.stringify({
              eventId: event.id,
              startAtLocal,
              timeZone: event.timeZone,
              dedupKey,
            }),
            dedupKey,
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
    const updated = await this.dataSource
      .query(
        `UPDATE interview_reminder_notification_intent
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
        `Interview reminder retry update failed for ${intent.id}`,
      );
    }
  }

  private async setStatus(
    manager: EntityManager,
    intentId: string,
    status: 'accepted' | 'suppressed',
  ): Promise<void> {
    await manager.query(
      `UPDATE interview_reminder_notification_intent
       SET status = $2, locked_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'processing'`,
      [intentId, status],
    );
  }
}

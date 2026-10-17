import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, EntityManager } from 'typeorm';
import {
  EventStatus,
  EventType,
  NotificationType,
  ParticipantStatus,
} from '../../core/domain/enums';
import { LOGGER_TOKEN } from '../logger/logger.service';
import { eventTypeLabel } from './notification-labels';

type EventLifecycleNotificationIntent = {
  id: string;
  kind: 'created' | 'rsvp';
  eventId: string;
  participantId: string;
  recipientId: string;
  eventTitle: string;
  eventType: EventType;
  eventStartAt: Date;
  eventTimeZone: string;
  actorUserId: string;
  actorName: string;
  fromStatus: string | null;
  toStatus: string | null;
  dedupKey: string;
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

const formatEventStart = (date: Date, timeZone: string): string =>
  new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone,
  }).format(date);

@Injectable()
export class EventLifecycleNotificationDispatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    const expired = await this.dataSource
      .query(
        `UPDATE event_lifecycle_notification_intent
       SET status = 'dead', locked_at = NULL, updated_at = now()
       WHERE attempt_count >= 8
         AND (status IN ('pending', 'retry')
           OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))`,
      )
      .then(
        () => 'updated' as const,
        () => 'failed' as const,
      );
    if (expired === 'failed') {
      this.logger.error('Event lifecycle notification expiry update failed');
      return;
    }

    const claimed = await this.dataSource
      .query<EventLifecycleNotificationIntent[]>(
        `WITH ready AS (
         SELECT id FROM event_lifecycle_notification_intent
         WHERE attempt_count < 8
           AND ((status IN ('pending', 'retry') AND available_at <= now())
             OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
         ORDER BY available_at, created_at
         FOR UPDATE SKIP LOCKED LIMIT 20
       )
       UPDATE event_lifecycle_notification_intent intent
       SET status = 'processing', attempt_count = attempt_count + 1,
           locked_at = now(), updated_at = now()
       FROM ready WHERE intent.id = ready.id
       RETURNING intent.id, intent.kind, intent.event_id AS "eventId",
         intent.participant_id AS "participantId",
         intent.recipient_id AS "recipientId", intent.event_title AS "eventTitle",
         intent.event_type AS "eventType", intent.event_start_at AS "eventStartAt",
         intent.event_time_zone AS "eventTimeZone",
         intent.actor_user_id AS "actorUserId", intent.actor_name AS "actorName",
         intent.from_status AS "fromStatus", intent.to_status AS "toStatus",
         intent.dedup_key AS "dedupKey"`,
      )
      .then(
        intents => ({ kind: 'claimed' as const, intents }),
        () => ({ kind: 'failed' as const }),
      );
    if (claimed.kind === 'failed') {
      this.logger.error('Event lifecycle notification claim failed');
      return;
    }

    for (const intent of claimed.intents) await this.deliver(intent);
  }

  private async deliver(
    intent: EventLifecycleNotificationIntent,
  ): Promise<void> {
    const outcome = await this.dataSource
      .transaction(async manager => {
        const events = await manager.query<
          Array<{ status: string; startAt: Date }>
        >(
          'SELECT status, "startAt" AS "startAt" FROM event WHERE id = $1::uuid FOR SHARE',
          [intent.eventId],
        );
        const participants = await manager.query<Array<{ status: string }>>(
          `SELECT status FROM event_participant
         WHERE id = $1::uuid AND event_id = $2::uuid
           AND user_id = $3::uuid FOR SHARE`,
          [
            intent.participantId,
            intent.eventId,
            intent.kind === 'rsvp' ? intent.actorUserId : intent.recipientId,
          ],
        );
        const recipients = await manager.query<
          Array<{ isActive: boolean; notification_preferences: unknown }>
        >(
          'SELECT "isActive", notification_preferences FROM "user" WHERE id = $1::uuid FOR SHARE',
          [intent.recipientId],
        );
        const event = events[0];
        const participant = participants[0];
        const recipient = recipients[0];
        const channels = recordField(
          recipient?.notification_preferences,
          'channels',
        );
        const eventsPreference = recordField(
          recipient?.notification_preferences,
          'events',
        );
        const stale =
          !event ||
          event.status !== String(EventStatus.SCHEDULED) ||
          new Date(event.startAt).getTime() <= Date.now() ||
          !participant ||
          (intent.kind === 'created' &&
            participant.status === String(ParticipantStatus.DECLINED)) ||
          (intent.kind === 'rsvp' && participant.status !== intent.toStatus);

        if (
          !recipient ||
          !recipient.isActive ||
          channels?.in_app === false ||
          eventsPreference?.interview === false ||
          stale
        ) {
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const claimed = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM event_lifecycle_notification_intent
           WHERE id = $1::uuid AND status = 'processing'
           FOR UPDATE`,
          [intent.id],
        );
        if (claimed.length === 0) return 'not_processing' as const;

        const notification = this.notification(intent);
        await manager.query(
          `WITH eligible_dedup AS (
           INSERT INTO notification_deduplication (user_id, type, dedup_key)
           VALUES ($1::uuid, $2, $7)
           ON CONFLICT (user_id, type, dedup_key) DO UPDATE
           SET created_at = now(), expires_at = now() + interval '1 hour'
           WHERE notification_deduplication.expires_at <= now()
           RETURNING 1
         )
         INSERT INTO notification (user_id, type, title, body, link, data)
         SELECT $1::uuid, $2, $3, $4, $5, $6 FROM eligible_dedup
         WHERE NOT EXISTS (
           SELECT 1 FROM notification
           WHERE user_id = $1::uuid AND type = $2
             AND data->>'dedupKey' = $7
             AND created_at > now() - interval '1 hour'
         )`,
          [
            intent.recipientId,
            NotificationType.INTERVIEW,
            notification.title,
            notification.body,
            '/dashboard/calendar',
            JSON.stringify({
              eventId: intent.eventId,
              eventType: intent.eventType,
              userId: intent.kind === 'rsvp' ? intent.actorUserId : undefined,
              status: intent.toStatus ?? undefined,
              dedupKey: intent.dedupKey,
            }),
            intent.dedupKey,
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
      `Event lifecycle notification delivery failed for ${intent.id}`,
    );
    const updated = await this.dataSource
      .query(
        `UPDATE event_lifecycle_notification_intent
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
        `Event lifecycle notification retry update failed for ${intent.id}`,
      );
    }
  }

  private notification(intent: EventLifecycleNotificationIntent): {
    title: string;
    body: string;
  } {
    if (intent.kind === 'created') {
      return {
        title:
          intent.eventType === 'interview'
            ? 'Nueva entrevista'
            : 'Nuevo evento',
        body: `${intent.actorName} agendó ${eventTypeLabel(intent.eventType)}: ${intent.eventTitle} para ${formatEventStart(intent.eventStartAt, intent.eventTimeZone)} (${intent.eventTimeZone})`,
      };
    }

    const verb =
      intent.toStatus === String(ParticipantStatus.ACCEPTED)
        ? 'aceptó'
        : intent.toStatus === String(ParticipantStatus.DECLINED)
          ? 'rechazó'
          : 'actualizó su respuesta a';
    return {
      title: 'Respuesta de invitación',
      body: `${intent.actorName} ${verb} '${intent.eventTitle}'`,
    };
  }

  private async setStatus(
    manager: EntityManager,
    intentId: string,
    status: 'accepted' | 'suppressed',
  ): Promise<void> {
    await manager.query(
      `UPDATE event_lifecycle_notification_intent
       SET status = $2, locked_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'processing'`,
      [intentId, status],
    );
  }
}

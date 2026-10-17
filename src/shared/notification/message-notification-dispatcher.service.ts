import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { NotificationType } from '../../core/domain/enums';
import { LOGGER_TOKEN } from '../logger/logger.service';

type MessageNotificationIntent = {
  id: string;
  messageId: string;
  chatId: string;
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

const stringField = (value: unknown, field: string): string | undefined => {
  if (!isRecord(value)) return undefined;
  const result = value[field];
  return typeof result === 'string' ? result : undefined;
};

@Injectable()
export class MessageNotificationDispatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    const claimed = await this.dataSource
      .query<MessageNotificationIntent[]>(
        `UPDATE message_notification_intent
         SET status = 'dead', locked_at = NULL, updated_at = now()
         WHERE attempt_count >= 8
           AND (status IN ('pending', 'retry')
             OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))`,
      )
      .then(
        () =>
          this.dataSource
            .query<MessageNotificationIntent[]>(
              `WITH ready AS (
                 SELECT id FROM message_notification_intent
                 WHERE attempt_count < 8
                   AND ((status IN ('pending', 'retry') AND available_at <= now())
                     OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
                 ORDER BY available_at, created_at
                 FOR UPDATE SKIP LOCKED LIMIT 20
               )
               UPDATE message_notification_intent intent
               SET status = 'processing', attempt_count = attempt_count + 1,
                   locked_at = now(), updated_at = now()
               FROM ready WHERE intent.id = ready.id
               RETURNING intent.id, intent.message_id AS "messageId",
                 intent.chat_id AS "chatId", intent.recipient_id AS "recipientId"`,
            )
            .then(
              intents => ({ kind: 'claimed' as const, intents }),
              () => ({ kind: 'error' as const }),
            ),
        () => ({ kind: 'error' as const }),
      );
    if (claimed.kind === 'error') {
      this.logger.error('Message notification claim failed');
      return;
    }

    for (const intent of claimed.intents) await this.deliver(intent);
  }

  private async deliver(intent: MessageNotificationIntent): Promise<void> {
    const outcome = await this.dataSource
      .transaction(async manager => {
        const recipients = await manager.query<
          Array<{ notification_preferences: unknown }>
        >(
          'SELECT notification_preferences FROM "user" WHERE id = $1 FOR SHARE',
          [intent.recipientId],
        );
        const preferences = recipients[0]?.notification_preferences;
        const channels = recordField(preferences, 'channels');
        const events = recordField(preferences, 'events');
        if (
          recipients.length === 0 ||
          channels?.in_app === false ||
          events?.message === false
        ) {
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const messages = await manager.query<
          Array<{
            content: string;
            type: string;
            contentType: unknown;
            senderName: string;
            senderAvatar: string | null;
          }>
        >(
          `SELECT message.content, message.type,
              message.content_type AS "contentType",
              sender.name AS "senderName", sender.avatar AS "senderAvatar"
           FROM message
           INNER JOIN "user" sender ON sender.id = message."senderId"
           WHERE message.id = $1::uuid AND message."chatId" = $2::uuid
             AND message."isRead" = false`,
          [intent.messageId, intent.chatId],
        );
        const message = messages[0];
        if (!message) {
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const offerIdCandidate =
          message.type === 'offer'
            ? stringField(message.contentType, 'offerLetterId')
            : undefined;
        const offerId =
          offerIdCandidate &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            offerIdCandidate,
          )
            ? offerIdCandidate
            : undefined;
        const isOffer = offerId !== undefined;
        const offer = isOffer
          ? (
              await manager.query<
                Array<{
                  status: string;
                  jobTitle: string | null;
                  jobId: string;
                }>
              >(
                `SELECT status, letter_data->>'jobTitle' AS "jobTitle", job_id AS "jobId"
                 FROM offer_letter WHERE id = $1::uuid FOR UPDATE`,
                [offerId],
              )
            )[0]
          : undefined;
        if (
          (message.type === 'offer' && !offer) ||
          (isOffer && offer?.status !== 'sent')
        ) {
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const dedupKey = isOffer
          ? `offer:${offerId}:sent`
          : `message:${intent.messageId}`;
        const title = isOffer ? 'Nueva carta de oferta' : 'Nuevo mensaje';
        const body = isOffer
          ? `Recibiste una carta de oferta para ${offer?.jobTitle ?? 'un puesto'}.`
          : `Tienes un nuevo mensaje de ${message.senderName}.`;
        const preview = message.content.replace(/\s+/g, ' ').trim();
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
            NotificationType.MESSAGE,
            title,
            body,
            `/dashboard/messages?chat=${intent.chatId}`,
            JSON.stringify(
              isOffer
                ? {
                    offerLetterId: offerId,
                    chatId: intent.chatId,
                    jobId: offer?.jobId,
                    dedupKey,
                  }
                : {
                    chatId: intent.chatId,
                    messageId: intent.messageId,
                    senderName: message.senderName,
                    senderAvatar: message.senderAvatar,
                    preview:
                      preview.length > 90
                        ? `${preview.slice(0, 90)}…`
                        : preview,
                    dedupKey,
                  },
            ),
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
    this.logger.error(`Message notification delivery failed for ${intent.id}`);
    await this.dataSource
      .query(
        `UPDATE message_notification_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
             locked_at = NULL, last_error_code = 'delivery_failed', updated_at = now()
         WHERE id = $1::uuid AND status = 'processing'`,
        [intent.id],
      )
      .then(
        () => undefined,
        () => {
          this.logger.error(
            `Message notification retry update failed for ${intent.id}`,
          );
          return undefined;
        },
      );
  }

  private async setStatus(
    manager: EntityManager,
    intentId: string,
    status: 'accepted' | 'suppressed',
  ): Promise<void> {
    await manager.query(
      `UPDATE message_notification_intent
       SET status = $2, locked_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'processing'`,
      [intentId, status],
    );
  }
}

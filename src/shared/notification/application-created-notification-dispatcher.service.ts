import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { NotificationType } from '../../core/domain/enums';
import { LOGGER_TOKEN } from '../logger/logger.service';

type ApplicationCreatedNotificationIntent = {
  id: string;
  applicationId: string;
  recipientId: string;
  jobId: string;
  candidateName: string;
  jobTitle: string;
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
export class ApplicationCreatedNotificationDispatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    const claimed = await this.dataSource
      .query(
        `UPDATE application_created_notification_intent
         SET status = 'dead', locked_at = NULL, updated_at = now()
         WHERE attempt_count >= 8
           AND (status IN ('pending', 'retry')
             OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))`,
      )
      .then(
        () =>
          this.dataSource
            .query<ApplicationCreatedNotificationIntent[]>(
              `WITH ready AS (
                 SELECT id FROM application_created_notification_intent
                 WHERE attempt_count < 8
                   AND ((status IN ('pending', 'retry') AND available_at <= now())
                     OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
                 ORDER BY available_at, created_at
                 FOR UPDATE SKIP LOCKED LIMIT 20
               )
               UPDATE application_created_notification_intent intent
               SET status = 'processing', attempt_count = attempt_count + 1,
                   locked_at = now(), updated_at = now()
               FROM ready WHERE intent.id = ready.id
               RETURNING intent.id, intent.application_id AS "applicationId",
                 intent.recipient_id AS "recipientId", intent.job_id AS "jobId",
                 intent.candidate_name AS "candidateName", intent.job_title AS "jobTitle"`,
            )
            .then(
              intents => ({ kind: 'claimed' as const, intents }),
              () => ({ kind: 'error' as const }),
            ),
        () => ({ kind: 'error' as const }),
      );
    if (claimed.kind === 'error') {
      this.logger.error('Application-created notification claim failed');
      return;
    }

    for (const intent of claimed.intents) await this.deliver(intent);
  }

  private async deliver(
    intent: ApplicationCreatedNotificationIntent,
  ): Promise<void> {
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
          events?.application === false
        ) {
          await this.setStatus(manager, intent.id, 'suppressed');
          return 'suppressed' as const;
        }

        const dedupKey = `app:${intent.applicationId}:created`;
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
            NotificationType.APPLICATION,
            'Nueva postulación',
            `${intent.candidateName} postuló a ${intent.jobTitle}`,
            '/dashboard/applications',
            JSON.stringify({
              applicationId: intent.applicationId,
              jobId: intent.jobId,
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
        `UPDATE application_created_notification_intent
         SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
             available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
             locked_at = NULL, last_error_code = 'delivery_failed', updated_at = now()
         WHERE id = $1 AND status = 'processing'`,
        [intent.id],
      )
      .then(
        () => 'updated' as const,
        () => 'failed' as const,
      );
    if (updated === 'failed') {
      this.logger.error(
        `Application-created notification retry update failed for ${intent.id}`,
      );
    }
  }

  private async setStatus(
    manager: EntityManager,
    intentId: string,
    status: 'accepted' | 'suppressed',
  ): Promise<void> {
    await manager.query(
      `UPDATE application_created_notification_intent
       SET status = $2, locked_at = NULL,
           last_error_code = NULL, updated_at = now()
       WHERE id = $1 AND status = 'processing'`,
      [intentId, status],
    );
  }
}

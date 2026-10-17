import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { LOGGER_TOKEN } from '../logger/logger.service';
import { CreateNotificationInput } from './notification.types';
import { NotificationType } from '../../core/domain/enums';

const DEDUP_WINDOW = '1 hour';

type HiringPlanReminderCandidate = {
  applicationId: string;
  candidateName: string;
  jobId: string;
  jobTitle: string;
  recipientId: string;
  stageAgeDays: number;
  targetDate: string | null;
  nextAction: string | null;
  reminderDate: string;
  isOverdue: boolean;
};

type ApplicationStatusNotificationIntent = {
  id: string;
  applicationId: string;
  recipientId: string;
  jobId: string;
  applicationStatus: string;
  jobTitle: string;
  statusLabel: string;
  statusHistoryId: string;
};

type NotificationPreferenceEvents = {
  application: boolean;
  interview: boolean;
  message: boolean;
  job_alert: boolean;
  system: boolean;
};

const EVENT_PREFERENCE_KEY: Record<
  NotificationType,
  keyof NotificationPreferenceEvents
> = {
  [NotificationType.APPLICATION]: 'application',
  [NotificationType.INTERVIEW]: 'interview',
  [NotificationType.MESSAGE]: 'message',
  [NotificationType.JOB_ALERT]: 'job_alert',
  [NotificationType.SYSTEM]: 'system',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

@Injectable()
export class NotificationService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  async create(input: CreateNotificationInput): Promise<void> {
    try {
      if (!(await this.isEnabledForUser(input))) return;

      const dataJson = JSON.stringify(this.mergeDedupKey(input));
      const dedupWindow = input.dedupWindow ?? DEDUP_WINDOW;
      if (input.dedupKey) {
        await this.dataSource.query(
          `WITH eligible_dedup AS (
             INSERT INTO notification_deduplication (user_id, type, dedup_key)
             VALUES ($1, $2, $7)
             ON CONFLICT (user_id, type, dedup_key) DO UPDATE
             SET created_at = now(), expires_at = now() + ($8)::interval
             WHERE notification_deduplication.expires_at <= now()
             RETURNING 1
           )
           INSERT INTO notification (user_id, type, title, body, link, data)
           SELECT $1, $2, $3, $4, $5, $6
           FROM eligible_dedup
           WHERE NOT EXISTS (
             SELECT 1 FROM notification
             WHERE user_id = $1
               AND type = $2
               AND data->>'dedupKey' = $7
               AND created_at > now() - ($8)::interval
           )`,
          [
            input.userId,
            input.type,
            input.title,
            input.body ?? null,
            input.link ?? null,
            dataJson,
            input.dedupKey,
            dedupWindow,
          ],
        );
        return;
      }
      await this.dataSource.query(
        `INSERT INTO notification (user_id, type, title, body, link, data)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          input.userId,
          input.type,
          input.title,
          input.body ?? null,
          input.link ?? null,
          dataJson,
        ],
      );
    } catch (error) {
      // EXCEPTION. REASON: notification creation is a best-effort, post-commit
      // side-effect. It must never break the primary domain operation that
      // already succeeded. The insert is performed after the domain change is
      // confirmed, so swallowing here cannot produce orphan notifications.
      this.logger.error(
        `notification insert failed: ${(error as Error).message}`,
        (error as Error).stack,
        'NotificationService',
      );
    }
  }

  async createMany(inputs: readonly CreateNotificationInput[]): Promise<void> {
    await Promise.all(inputs.map(input => this.create(input)));
  }

  async createForAdmins(
    input: Omit<CreateNotificationInput, 'userId'>,
  ): Promise<void> {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(Boolean);
    const [result] = await Promise.allSettled([
      this.dataSource.query<Array<{ id: string }>>(
        `SELECT id FROM "user"
         WHERE "isActive" = true
           AND (type = 'admin' OR LOWER(email) = ANY($1::text[]))`,
        [adminEmails],
      ),
    ]);

    if (result.status === 'rejected') {
      const message =
        result.reason instanceof Error
          ? result.reason.message
          : String(result.reason);
      this.logger.error(
        `admin notification recipient lookup failed: ${message}`,
        result.reason instanceof Error ? result.reason.stack : undefined,
        'NotificationService',
      );
      return;
    }

    await this.createMany(
      result.value.map(({ id }) => ({ ...input, userId: id })),
    );
  }

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatchApplicationStatusNotifications(): Promise<void> {
    await this.dataSource
      .query(
        `UPDATE application_status_notification_intent
       SET status = 'dead', locked_at = NULL, updated_at = now()
       WHERE attempt_count >= 8
         AND (status IN ('pending', 'retry')
           OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))`,
      )
      .then(
        () => undefined,
        () => {
          this.logger.error('Application status notification cleanup failed');
          return undefined;
        },
      );

    const claimed = await this.dataSource
      .query<ApplicationStatusNotificationIntent[]>(
        `WITH ready AS (
         SELECT id
         FROM application_status_notification_intent
         WHERE attempt_count < 8
           AND ((status IN ('pending', 'retry') AND available_at <= now())
             OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
         ORDER BY available_at, created_at
         FOR UPDATE SKIP LOCKED
         LIMIT 20
       )
       UPDATE application_status_notification_intent intent
       SET status = 'processing', attempt_count = intent.attempt_count + 1,
           locked_at = now(), updated_at = now()
       FROM ready
       WHERE intent.id = ready.id
       RETURNING intent.id, intent.application_id AS "applicationId",
         intent.recipient_id AS "recipientId", intent.job_id AS "jobId",
         intent.application_status AS "applicationStatus", intent.job_title AS "jobTitle",
         intent.status_label AS "statusLabel",
         intent.status_history_id AS "statusHistoryId"`,
      )
      .then(
        intents => ({ kind: 'claimed' as const, intents }),
        () => ({ kind: 'error' as const }),
      );
    if (claimed.kind === 'error') {
      this.logger.error('Application status notification claim failed');
      return;
    }

    for (const intent of claimed.intents) {
      await this.deliverApplicationStatusNotification(intent);
    }
  }

  private async deliverApplicationStatusNotification(
    intent: ApplicationStatusNotificationIntent,
  ): Promise<void> {
    const outcome = await this.dataSource
      .transaction(async manager => {
        const rows = await manager.query<
          Array<{ notification_preferences: unknown }>
        >(
          'SELECT notification_preferences FROM "user" WHERE id = $1 FOR SHARE',
          [intent.recipientId],
        );
        const row = rows[0];
        const preferences =
          isRecord(row) && isRecord(row.notification_preferences)
            ? row.notification_preferences
            : undefined;
        const channels = isRecord(preferences?.channels)
          ? preferences.channels
          : undefined;
        const events = isRecord(preferences?.events)
          ? preferences.events
          : undefined;
        const enabled =
          row !== undefined &&
          channels?.in_app !== false &&
          events?.application !== false;

        if (!enabled) {
          await manager.query(
            `UPDATE application_status_notification_intent
           SET status = 'suppressed', locked_at = NULL, updated_at = now()
           WHERE id = $1 AND status = 'processing'`,
            [intent.id],
          );
          return 'suppressed' as const;
        }

        const dedupKey = `app:${intent.applicationId}:history:${intent.statusHistoryId}`;
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
         SELECT $1, $2, $3, $4, $5, $6
         FROM eligible_dedup
         WHERE NOT EXISTS (
           SELECT 1 FROM notification
           WHERE user_id = $1 AND type = $2
             AND data->>'dedupKey' = $7
             AND created_at > now() - interval '1 hour'
         )`,
          [
            intent.recipientId,
            NotificationType.APPLICATION,
            'Actualización de postulación',
            `Tu postulación a ${intent.jobTitle} pasó a ${intent.statusLabel}`,
            '/dashboard/my-applications',
            JSON.stringify({
              applicationId: intent.applicationId,
              jobId: intent.jobId,
              status: intent.applicationStatus,
              dedupKey,
            }),
            dedupKey,
          ],
        );
        await manager.query(
          `UPDATE application_status_notification_intent
         SET status = 'accepted', locked_at = NULL, last_error_code = NULL,
             updated_at = now()
         WHERE id = $1 AND status = 'processing'`,
          [intent.id],
        );
        return 'accepted' as const;
      })
      .then(
        result => ({ kind: result }),
        () => {
          this.logger.error(
            `Application status notification delivery failed for ${intent.id}`,
          );
          return { kind: 'failed' as const };
        },
      );

    if (outcome.kind !== 'failed') return;
    await this.dataSource
      .query(
        `UPDATE application_status_notification_intent
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
            'Application status notification retry update failed',
          );
          return undefined;
        },
      );
  }

  @Cron('0 9 * * 1-5', {
    timeZone: 'America/Santiago',
    disabled: process.env.VERCEL === '1',
  })
  async sendHiringPlanReminders(): Promise<void> {
    const candidates = await this.dataSource.query<
      HiringPlanReminderCandidate[]
    >(
      `SELECT application.id AS "applicationId",
              candidate.name AS "candidateName",
              job.id AS "jobId",
              job.title AS "jobTitle",
              COALESCE(assignee.id, owner.id) AS "recipientId",
              GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - application."stageChangedAt")) / 86400))::int AS "stageAgeDays",
              application.target_date AS "targetDate",
              application.next_action AS "nextAction",
              TO_CHAR(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') AS "reminderDate",
              application.target_date IS NOT NULL AND application.target_date < CURRENT_DATE AS "isOverdue"
       FROM application
       JOIN job ON job.id = application."jobId"
       JOIN "user" AS candidate ON candidate.id = application."candidateId"
       LEFT JOIN "user" AS owner
         ON owner."organizationId" = job."organizationId"
        AND owner."isActive" = true
        AND owner.type = 'organization'
       LEFT JOIN "user" AS assignee
         ON assignee.id = application.assignee_id
        AND assignee."isActive" = true
        AND assignee.type = 'organization'
        AND (
          assignee."organizationId" = job."organizationId"
          OR EXISTS (
            SELECT 1
            FROM organization_member AS eligible_assignee
            WHERE eligible_assignee.organization_id = job."organizationId"
              AND eligible_assignee.user_id = assignee.id
              AND eligible_assignee.role IN ('admin', 'recruiter')
          )
        )
       WHERE application.status NOT IN ('contratado', 'rechazado', 'desistido')
         AND COALESCE(assignee.id, owner.id) IS NOT NULL
         AND (
           application."stageChangedAt" <= CURRENT_TIMESTAMP - INTERVAL '7 days'
           OR application.target_date < CURRENT_DATE
         )`,
    );

    await this.createMany(
      candidates.map(candidate => ({
        userId: candidate.recipientId,
        type: NotificationType.APPLICATION,
        title: candidate.isOverdue
          ? 'Candidatura con fecha vencida'
          : 'Candidatura sin movimiento',
        body: candidate.isOverdue
          ? `${candidate.candidateName} · ${candidate.jobTitle}: ${candidate.nextAction ?? 'revisar próxima acción'}`
          : `${candidate.candidateName} lleva ${candidate.stageAgeDays} días en ${candidate.jobTitle}: ${candidate.nextAction ?? 'revisar próxima acción'}`,
        link: `/dashboard/offers/${candidate.jobId}/applications/${candidate.applicationId}`,
        data: {
          applicationId: candidate.applicationId,
          jobId: candidate.jobId,
          targetDate: candidate.targetDate,
          nextAction: candidate.nextAction,
          overdue: candidate.isOverdue,
        },
        dedupKey: `application-reminder:${candidate.applicationId}:${candidate.reminderDate}`,
        dedupWindow: '25 hours',
      })),
    );
  }

  @Cron(CronExpression.EVERY_HOUR, { disabled: process.env.VERCEL === '1' })
  async deleteExpiredDeduplicationKeys(): Promise<void> {
    try {
      await this.dataSource.query(
        'DELETE FROM notification_deduplication WHERE expires_at <= now()',
      );
    } catch (error) {
      this.logger.error(
        `notification deduplication cleanup failed: ${(error as Error).message}`,
        (error as Error).stack,
        'NotificationService',
      );
    }
  }

  private mergeDedupKey(
    input: CreateNotificationInput,
  ): Record<string, unknown> {
    if (!input.dedupKey) {
      return input.data ?? {};
    }
    return { ...(input.data ?? {}), dedupKey: input.dedupKey };
  }

  private async isEnabledForUser(
    input: CreateNotificationInput,
  ): Promise<boolean> {
    const rows = await this.dataSource.query<
      Array<{ notification_preferences: unknown }>
    >('SELECT notification_preferences FROM "user" WHERE id = $1', [
      input.userId,
    ]);
    const row = rows[0];
    const preferences =
      isRecord(row) && isRecord(row.notification_preferences)
        ? row.notification_preferences
        : undefined;
    const channels = isRecord(preferences?.channels)
      ? preferences.channels
      : undefined;
    const events = isRecord(preferences?.events)
      ? preferences.events
      : undefined;

    return (
      channels?.in_app !== false &&
      events?.[EVENT_PREFERENCE_KEY[input.type]] !== false
    );
  }
}

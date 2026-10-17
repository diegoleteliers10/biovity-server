import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import * as crypto from 'crypto';
import { DataSource, EntityManager } from 'typeorm';
import { NotificationType } from '../../core/domain/enums';
import {
  matchesCandidateProfileSearch,
  parseCandidateSearchFilters,
} from '../../core/services/candidate-profile-search-matcher';
import { LOGGER_TOKEN } from '../logger/logger.service';

type ProfileChange = {
  id: string;
  candidateId: string;
  snapshot: unknown;
};

type SavedSearchRow = {
  id: string;
  organizationId: string;
  name: string;
  filters: unknown;
};

type RecipientRow = {
  id: string;
  digest: 'immediate' | 'daily' | 'weekly';
};

type BucketRow = {
  id: string;
  recipientId: string;
  frequency: 'immediate' | 'daily' | 'weekly';
  attemptCount: number;
};

type MatchRow = {
  matchId: string;
  candidateId: string;
  savedSearchId: string;
  organizationId: string;
  savedSearchName: string;
  filters: unknown;
  notifyEnabled: boolean;
  snapshot: unknown;
  accessAllowed: boolean;
};

type BucketItem = {
  candidateId: string;
  savedSearchId: string;
  savedSearchName: string;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

@Injectable()
export class SavedSearchAlertDispatcherService {
  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE, { disabled: process.env.VERCEL === '1' })
  async dispatch(): Promise<void> {
    await this.processProfileChanges();
    await this.deliverDueBuckets();
  }

  private async processProfileChanges(): Promise<void> {
    let failedChangeIds: string[] = [];
    const result = await this.dataSource
      .transaction(async manager => {
        const changes = await manager.query<ProfileChange[]>(`
          SELECT id, candidate_id AS "candidateId", snapshot
          FROM candidate_profile_change
          WHERE processed_at IS NULL AND match_failed_at IS NULL
          ORDER BY created_at, id
          FOR UPDATE SKIP LOCKED
          LIMIT 20
        `);
        if (changes.length === 0) return 'empty' as const;
        failedChangeIds = changes.map(change => change.id);

        const searches = await manager.query<SavedSearchRow[]>(`
          SELECT search.id, search.organization_id AS "organizationId",
                 search.name, search.filters
          FROM saved_search search
          JOIN organization ON organization.id = search.organization_id
          WHERE search.notify_enabled = true
            AND organization.verification_status = 'verified'
          ORDER BY search.created_at, search.id
        `);

        for (const change of changes) {
          const invalidSearchFound = await this.processChange(
            manager,
            change,
            searches,
          );
          await manager.query(
            `UPDATE candidate_profile_change
             SET processed_at = now(),
                 match_last_error = CASE WHEN $2 THEN 'invalid_saved_search_filters' ELSE NULL END
             WHERE id = $1 AND processed_at IS NULL`,
            [change.id, invalidSearchFound],
          );
        }

        return 'processed' as const;
      })
      .then(
        value => ({ kind: value }),
        () => ({ kind: 'failed' as const }),
      );

    if (result.kind !== 'failed') return;
    this.logger.error('Saved search profile matching transaction failed');
    await this.markProfileChangesFailed(failedChangeIds);
  }

  private async processChange(
    manager: EntityManager,
    change: ProfileChange,
    searches: SavedSearchRow[],
  ): Promise<boolean> {
    let invalidSearchFound = false;
    for (const search of searches) {
      const parsed = parseCandidateSearchFilters(search.filters);
      if (parsed.kind === 'invalid') {
        invalidSearchFound = true;
        continue;
      }
      if (!isRecord(change.snapshot)) continue;
      if (!matchesCandidateProfileSearch(change.snapshot, parsed.filters))
        continue;

      const matchId = await this.saveMatch(manager, search, change);
      const recipients = await this.recruiterRecipients(
        manager,
        search.organizationId,
      );
      for (const recipient of recipients) {
        await this.addToDeliveryBucket(manager, matchId, recipient);
      }
    }
    return invalidSearchFound;
  }

  private async saveMatch(
    manager: EntityManager,
    search: SavedSearchRow,
    change: ProfileChange,
  ): Promise<string> {
    const rows = await manager.query<Array<{ id: string }>>(
      `INSERT INTO candidate_search_match (
         id, saved_search_id, profile_change_id, candidate_id
       ) VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid)
       ON CONFLICT (saved_search_id, profile_change_id) DO UPDATE
       SET saved_search_id = EXCLUDED.saved_search_id
       RETURNING id`,
      [crypto.randomUUID(), search.id, change.id, change.candidateId],
    );
    return rows[0].id;
  }

  private async recruiterRecipients(
    manager: EntityManager,
    organizationId: string,
  ): Promise<RecipientRow[]> {
    return manager.query<RecipientRow[]>(
      `SELECT member.id,
              member.notification_preferences->>'digest' AS digest
       FROM "user" member
       WHERE member.type = 'organization'
         AND member."isActive" = true
         AND member.notification_preferences #>> '{channels,in_app}' = 'true'
         AND member.notification_preferences #>> '{events,job_alert}' = 'true'
         AND member.notification_preferences->>'digest' IN ('immediate', 'daily', 'weekly')
         AND (
           member."organizationId" = $1::uuid
           OR EXISTS (
             SELECT 1 FROM organization_member membership
             WHERE membership.organization_id = $1::uuid
               AND membership.user_id = member.id
               AND membership.role IN ('admin', 'recruiter')
           )
         )
       ORDER BY member.id`,
      [organizationId],
    );
  }

  private async addToDeliveryBucket(
    manager: EntityManager,
    matchId: string,
    recipient: RecipientRow,
  ): Promise<void> {
    const rows = await manager.query<Array<{ id: string }>>(
      `WITH local_time AS (
         SELECT now() AS instant,
                now() AT TIME ZONE 'America/Santiago' AS local_now
       ), schedule AS (
         SELECT instant,
           CASE
             WHEN $2::text = 'daily' THEN
               date_trunc('day', local_now) + interval '9 hours'
               + CASE WHEN local_now < date_trunc('day', local_now) + interval '9 hours'
                      THEN interval '0 days' ELSE interval '1 day' END
             WHEN $2::text = 'weekly' THEN
               date_trunc('week', local_now) + interval '9 hours'
               + CASE WHEN local_now < date_trunc('week', local_now) + interval '9 hours'
                      THEN interval '0 days' ELSE interval '7 days' END
             ELSE local_now
           END AS delivery_local
         FROM local_time
       ), delivery_window AS (
         SELECT instant,
           CASE WHEN $2::text = 'immediate' THEN $3::text
                ELSE to_char(delivery_local, 'YYYY-MM-DD') END AS window_key,
           CASE WHEN $2::text = 'immediate' THEN instant
                ELSE delivery_local AT TIME ZONE 'America/Santiago' END AS available_at
         FROM schedule
       )
       INSERT INTO saved_search_alert_bucket (
         id, recipient_id, frequency, window_key, available_at
       )
       SELECT $1::uuid, $4::uuid, $2::text, delivery_window.window_key, delivery_window.available_at
       FROM delivery_window
       ON CONFLICT (recipient_id, frequency, window_key) DO UPDATE
       SET updated_at = saved_search_alert_bucket.updated_at
       RETURNING id`,
      [crypto.randomUUID(), recipient.digest, matchId, recipient.id],
    );
    await manager.query(
      `INSERT INTO saved_search_alert_bucket_item (bucket_id, match_id)
       VALUES ($1::uuid, $2::uuid)
       ON CONFLICT (bucket_id, match_id) DO NOTHING`,
      [rows[0].id, matchId],
    );
  }

  private async markProfileChangesFailed(changeIds: string[]): Promise<void> {
    if (changeIds.length === 0) return;
    await this.dataSource
      .query(
        `
        UPDATE candidate_profile_change change
        SET match_attempt_count = change.match_attempt_count + 1,
            match_last_error = 'matching_transaction_failed',
            match_failed_at = CASE
              WHEN change.match_attempt_count + 1 >= 8 THEN now()
              ELSE NULL
            END
        WHERE change.id = ANY($1::uuid[])
          AND change.processed_at IS NULL AND change.match_failed_at IS NULL
      `,
        [changeIds],
      )
      .then(
        () => undefined,
        () => {
          this.logger.error('Saved search profile failure update failed');
        },
      );
  }

  private async deliverDueBuckets(): Promise<void> {
    const rows = await this.dataSource
      .query<Array<{ id: string }>>(
        `
        UPDATE saved_search_alert_bucket
        SET status = 'dead', locked_at = NULL, updated_at = now(),
            last_error_code = 'attempt_limit_reached'
        WHERE attempt_count >= 8
          AND (status = 'pending'
            OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
        RETURNING id
      `,
      )
      .then(
        () =>
          this.dataSource.query<Array<{ id: string }>>(`
            SELECT id FROM saved_search_alert_bucket
            WHERE status = 'pending' AND available_at <= now()
            ORDER BY available_at, created_at
            LIMIT 20
          `),
        () => null,
      );
    if (!rows) {
      this.logger.error('Saved search alert bucket lookup failed');
      return;
    }
    for (const row of rows) await this.deliverBucket(row.id);
  }

  private async deliverBucket(bucketId: string): Promise<void> {
    const result = await this.dataSource
      .transaction(async manager => {
        const buckets = await manager.query<BucketRow[]>(
          `SELECT id, recipient_id AS "recipientId", frequency,
                  attempt_count AS "attemptCount"
           FROM saved_search_alert_bucket
           WHERE id = $1::uuid AND status = 'pending' AND available_at <= now()
           FOR UPDATE`,
          [bucketId],
        );
        const bucket = buckets[0];
        if (!bucket) return 'missing' as const;

        await manager.query(
          `UPDATE saved_search_alert_bucket
           SET status = 'processing', attempt_count = attempt_count + 1,
               locked_at = now(), updated_at = now()
           WHERE id = $1::uuid AND status = 'pending'`,
          [bucket.id],
        );

        const recipients = await manager.query<
          Array<{ type: string; active: boolean; preferences: unknown }>
        >(
          `SELECT type, "isActive" AS active, notification_preferences AS preferences
           FROM "user" WHERE id = $1::uuid FOR SHARE`,
          [bucket.recipientId],
        );
        const preferences = recipients[0]?.preferences;
        const channels = isRecord(preferences)
          ? preferences.channels
          : undefined;
        const events = isRecord(preferences) ? preferences.events : undefined;
        const digest = isRecord(preferences) ? preferences.digest : undefined;
        const validRecipient =
          recipients[0]?.type === 'organization' &&
          recipients[0]?.active === true &&
          isRecord(channels) &&
          channels.in_app === true &&
          isRecord(events) &&
          events.job_alert === true &&
          digest === bucket.frequency;
        if (!validRecipient) {
          await this.finishBucket(manager, bucket.id, 'suppressed');
          return 'suppressed' as const;
        }

        const matches = await this.currentMatches(manager, bucket);
        const eligible: BucketItem[] = [];
        for (const match of matches) {
          const parsed = parseCandidateSearchFilters(match.filters);
          const isEligible =
            match.accessAllowed &&
            match.notifyEnabled &&
            parsed.kind === 'valid' &&
            isRecord(match.snapshot) &&
            matchesCandidateProfileSearch(match.snapshot, parsed.filters);
          await manager.query(
            `UPDATE saved_search_alert_bucket_item
             SET status = $3
             WHERE bucket_id = $1::uuid AND match_id = $2::uuid`,
            [bucket.id, match.matchId, isEligible ? 'accepted' : 'suppressed'],
          );
          if (isEligible) {
            eligible.push({
              candidateId: match.candidateId,
              savedSearchId: match.savedSearchId,
              savedSearchName: match.savedSearchName,
            });
          }
        }

        if (eligible.length === 0) {
          await this.finishBucket(manager, bucket.id, 'suppressed');
          return 'suppressed' as const;
        }

        await this.createNotification(manager, bucket, eligible);
        await this.finishBucket(manager, bucket.id, 'sent');
        return 'sent' as const;
      })
      .then(
        value => ({ kind: value }),
        () => ({ kind: 'failed' as const }),
      );

    if (result.kind !== 'failed') return;
    await this.retryBucket(bucketId);
  }

  private async currentMatches(
    manager: EntityManager,
    bucket: BucketRow,
  ): Promise<MatchRow[]> {
    return manager.query<MatchRow[]>(
      `SELECT item.match_id AS "matchId",
              matched.candidate_id AS "candidateId",
              search.id AS "savedSearchId",
              search.organization_id AS "organizationId",
              search.name AS "savedSearchName",
              search.filters,
              search.notify_enabled AS "notifyEnabled",
              latest.snapshot,
              (
                organization.verification_status = 'verified'
                AND (
                  recipient."organizationId" = search.organization_id
                  OR EXISTS (
                    SELECT 1 FROM organization_member membership
                    WHERE membership.organization_id = search.organization_id
                      AND membership.user_id = recipient.id
                      AND membership.role IN ('admin', 'recruiter')
                  )
                )
              ) AS "accessAllowed"
       FROM saved_search_alert_bucket_item item
       JOIN candidate_search_match matched ON matched.id = item.match_id
       JOIN saved_search search ON search.id = matched.saved_search_id
       JOIN organization ON organization.id = search.organization_id
       JOIN "user" recipient ON recipient.id = $2::uuid
       JOIN "user" candidate ON candidate.id = matched.candidate_id
         AND candidate.type = 'professional' AND candidate."isActive" = true
       JOIN LATERAL (
         SELECT change.snapshot
         FROM candidate_profile_change change
         WHERE change.candidate_id = matched.candidate_id
         ORDER BY change.created_at DESC, change.id DESC
         LIMIT 1
       ) latest ON true
       WHERE item.bucket_id = $1::uuid
         AND item.status = 'pending'
       ORDER BY matched.created_at, matched.id`,
      [bucket.id, bucket.recipientId],
    );
  }

  private async createNotification(
    manager: EntityManager,
    bucket: BucketRow,
    items: BucketItem[],
  ): Promise<void> {
    const candidateIds = [...new Set(items.map(item => item.candidateId))];
    const savedSearchIds = [...new Set(items.map(item => item.savedSearchId))];
    const firstCandidateId = candidateIds[0];
    const count = candidateIds.length;
    await manager.query(
      `INSERT INTO notification (user_id, type, title, body, link, data)
       VALUES ($1::uuid, $2, $3, $4, $5, $6::jsonb)`,
      [
        bucket.recipientId,
        NotificationType.JOB_ALERT,
        'Nuevos perfiles en tus búsquedas',
        `${count} ${count === 1 ? 'perfil nuevo coincide' : 'perfiles nuevos coinciden'} con tus búsquedas guardadas.`,
        `/dashboard/organization/talent?view=${encodeURIComponent(firstCandidateId)}`,
        JSON.stringify({
          candidateIds,
          savedSearchIds,
          frequency: bucket.frequency,
        }),
      ],
    );
  }

  private async finishBucket(
    manager: EntityManager,
    bucketId: string,
    status: 'sent' | 'suppressed',
  ): Promise<void> {
    await manager.query(
      `UPDATE saved_search_alert_bucket
       SET status = $2, locked_at = NULL,
           sent_at = CASE WHEN $2 = 'sent' THEN now() ELSE NULL END,
           last_error_code = NULL, updated_at = now()
       WHERE id = $1::uuid AND status = 'processing'`,
      [bucketId, status],
    );
  }

  private async retryBucket(bucketId: string): Promise<void> {
    await this.dataSource
      .query(
        `UPDATE saved_search_alert_bucket
         SET status = CASE WHEN attempt_count + 1 >= 8 THEN 'dead' ELSE 'pending' END,
             attempt_count = LEAST(attempt_count + 1, 8),
             available_at = now() + LEAST(3600, power(2, attempt_count + 1) * 30) * interval '1 second',
             locked_at = NULL, last_error_code = 'delivery_failed', updated_at = now()
         WHERE id = $1::uuid AND status = 'pending'`,
        [bucketId],
      )
      .then(
        () => undefined,
        () => {
          this.logger.error(
            `Saved search alert retry update failed: ${bucketId}`,
          );
        },
      );
  }
}

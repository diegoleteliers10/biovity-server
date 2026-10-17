import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import * as crypto from 'crypto';
import { Resume } from '../domain/entities/resume.entity';
import { ResumeDomainOrmMapper } from '../../shared/mappers/resume/resumeDomain-orm.mapper';
import { recordCandidateProfileChange } from '../../infrastructure/persistence/candidate-profile-change';
import { ResumeEntity } from '../../infrastructure/database/orm/resume.entity';

type ResumeRow = {
  id: string;
  userId: string;
  cvFile: Resume['cvFile'];
  cvVersion: number;
};
type ReservationRow = {
  id: string;
  path: string;
  expected_version: number;
  status: 'active' | 'finalized' | 'expired';
};
type CleanupRow = {
  id: string;
  path: string;
  bucket: string;
  lease_token: string;
};

export type CvUploadReservation = {
  reservationId: string;
  path: string;
  version: number;
};
export type CvCleanupItem = {
  id: string;
  path: string;
  bucket: string;
  leaseToken: string;
};
export type CvFileMetadata = {
  url: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
};

const CV_STORAGE_BUCKET = process.env.SUPABASE_CV_BUCKET ?? 'biovity_cv';

@Injectable()
export class ResumeCvLifecycleService {
  constructor(private readonly dataSource: DataSource) {}

  async reserve(
    resumeId: string,
    expectedVersion: number,
  ): Promise<CvUploadReservation> {
    return this.dataSource.transaction(async manager => {
      const resume = await this.lockResume(manager, resumeId);
      if (resume.cvVersion !== expectedVersion) {
        return Promise.reject(
          new ConflictException(
            'CV version changed. Reload the resume and try again.',
          ),
        );
      }

      const reservationId = crypto.randomUUID();
      const path = `cv/${resume.userId}/${reservationId}.pdf`;
      await manager.query(
        `INSERT INTO public.resume_cv_upload_reservation
          (id, resume_id, user_id, object_path, expected_version, status, expires_at)
         VALUES ($1, $2, $3, $4, $5, 'active', now() + interval '1 hour')`,
        [reservationId, resume.id, resume.userId, path, expectedVersion],
      );
      return { reservationId, path, version: resume.cvVersion };
    });
  }

  async finalize(
    resumeId: string,
    reservationId: string,
    metadata: CvFileMetadata,
  ): Promise<Resume> {
    const finalized = await this.dataSource.transaction(async manager => {
      const resume = await this.lockResume(manager, resumeId);
      const reservations = await manager.query<ReservationRow[]>(
        `SELECT id, object_path AS path, expected_version, status
           FROM public.resume_cv_upload_reservation
          WHERE id = $1 AND resume_id = $2
          FOR UPDATE`,
        [reservationId, resumeId],
      );
      const reservation = reservations[0];
      if (!reservation)
        return Promise.reject(
          new NotFoundException('CV upload reservation not found'),
        );
      if (
        reservation.status !== 'active' ||
        resume.cvVersion !== reservation.expected_version
      ) {
        await this.enqueueCleanup(manager, reservation.path);
        return false;
      }

      const oldPath = resume.cvFile?.path;
      const updated = await manager.query<Array<{ id: string }>>(
        `UPDATE public.resume
            SET "cvFile" = $3::json,
                cv_version = cv_version + 1,
                "updatedAt" = now()
          WHERE id = $1 AND cv_version = $2
          RETURNING id`,
        [
          resumeId,
          reservation.expected_version,
          JSON.stringify({
            ...metadata,
            path: reservation.path,
            uploadedAt: new Date().toISOString(),
          }),
        ],
      );
      if (!updated[0]) {
        await this.enqueueCleanup(manager, reservation.path);
        return false;
      }
      await manager.query(
        `UPDATE public.resume_cv_upload_reservation SET status = 'finalized' WHERE id = $1`,
        [reservationId],
      );
      if (oldPath && oldPath !== reservation.path)
        await this.enqueueCleanup(manager, oldPath);
      return true;
    });
    if (!finalized)
      return Promise.reject(
        new ConflictException('CV upload reservation is expired or stale.'),
      );
    return this.getResume(resumeId);
  }

  async delete(
    resumeId: string,
    expectedPath: string,
    expectedVersion: number,
  ): Promise<Resume> {
    await this.dataSource.transaction(async manager => {
      const resume = await this.lockResume(manager, resumeId);
      if (
        resume.cvVersion !== expectedVersion ||
        resume.cvFile?.path !== expectedPath
      ) {
        return Promise.reject(
          new ConflictException('CV changed. Reload the resume and try again.'),
        );
      }
      await manager.query(
        `UPDATE public.resume
            SET "cvFile" = NULL, cv_version = cv_version + 1, "updatedAt" = now()
          WHERE id = $1 AND cv_version = $2`,
        [resumeId, expectedVersion],
      );
      await this.enqueueCleanup(manager, expectedPath);
    });
    return this.getResume(resumeId);
  }

  async claim(limit: number): Promise<CvCleanupItem[]> {
    return this.dataSource.transaction(async manager => {
      await manager.query(
        `WITH expired AS (
           UPDATE public.resume_cv_upload_reservation
              SET status = 'expired'
            WHERE status = 'active' AND expires_at <= now()
            RETURNING object_path
         )
         INSERT INTO public.resume_cv_cleanup (storage_bucket, object_path)
         SELECT $1, object_path FROM expired
         ON CONFLICT (storage_bucket, object_path) DO NOTHING`,
        [CV_STORAGE_BUCKET],
      );
      const rows = await manager.query<CleanupRow[]>(
        `WITH candidates AS (
           SELECT q.id
             FROM public.resume_cv_cleanup q
            WHERE ((q.status = 'pending' AND q.available_at <= now())
                   OR (q.status = 'leased' AND q.lease_expires_at <= now()))
              AND NOT EXISTS (
                SELECT 1 FROM public.resume r
                 WHERE q.storage_bucket = $2 AND r."cvFile"->>'path' = q.object_path
              )
              AND NOT EXISTS (
                SELECT 1 FROM public.application a
                 WHERE q.storage_bucket = $2 AND (split_part(a.resume_url, '?', 1) = q.object_path
                    OR right(split_part(a.resume_url, '?', 1), length(q.object_path)) = q.object_path
                    OR lower(right(split_part(a.resume_url, '?', 1), length(replace(q.object_path, '/', '%2f'))))
                       = lower(replace(q.object_path, '/', '%2f')))
              )
              AND NOT EXISTS (
                SELECT 1 FROM public.message message
                 WHERE message.content_type ->> 'url' ~ '/storage/v1/object/(public|sign|authenticated)/'
                   AND split_part(regexp_replace(split_part(message.content_type ->> 'url', '?', 1),
                         '^.*/storage/v1/object/(public|sign|authenticated)/', ''), '/', 1) = q.storage_bucket
                   AND regexp_replace(regexp_replace(split_part(message.content_type ->> 'url', '?', 1),
                         '^.*/storage/v1/object/(public|sign|authenticated)/[^/]+/', ''), '%2[fF]', '/', 'g') = q.object_path
              )
            ORDER BY q.created_at
            LIMIT $1
            FOR UPDATE SKIP LOCKED
         )
         UPDATE public.resume_cv_cleanup q
            SET status = 'leased', lease_token = gen_random_uuid(),
                lease_expires_at = now() + interval '5 minutes', attempts = attempts + 1
           FROM candidates c
          WHERE q.id = c.id
          RETURNING q.id, q.object_path AS path, q.storage_bucket AS bucket, q.lease_token::text`,
        [Math.max(1, Math.min(limit, 50)), CV_STORAGE_BUCKET],
      );
      return rows.map(row => ({
        id: row.id,
        path: row.path,
        bucket: row.bucket,
        leaseToken: row.lease_token,
      }));
    });
  }

  async finish(
    cleanupId: string,
    leaseToken: string,
  ): Promise<'deleted' | 'protected' | 'stale'> {
    return this.dataSource.transaction(async manager => {
      const rows = await manager.query<Array<{ path: string; bucket: string }>>(
        `SELECT object_path AS path, storage_bucket AS bucket FROM public.resume_cv_cleanup
          WHERE id = $1 AND status = 'leased' AND lease_token = $2 FOR UPDATE`,
        [cleanupId, leaseToken],
      );
      const row = rows[0];
      if (!row) return 'stale';
      const referenced = await this.pathIsReferenced(
        manager,
        row.bucket,
        row.path,
      );
      await manager.query(
        `UPDATE public.resume_cv_cleanup
            SET status = 'completed',
                object_path = CASE WHEN $3 THEN object_path ELSE 'purged/' || id::text END,
                lease_token = NULL, lease_expires_at = NULL,
                last_error = CASE WHEN $3 THEN 'protected by active reference' ELSE NULL END
          WHERE id = $1`,
        [cleanupId, leaseToken, referenced],
      );
      return referenced ? 'protected' : 'deleted';
    });
  }

  async fail(
    cleanupId: string,
    leaseToken: string,
    error: string,
  ): Promise<'retrying' | 'dead' | 'stale'> {
    const rows = await this.dataSource.query<Array<{ attempts: number }>>(
      `UPDATE public.resume_cv_cleanup
          SET status = CASE WHEN attempts >= 8 THEN 'dead' ELSE 'pending' END,
              available_at = now() + make_interval(secs => LEAST(3600, 30 * power(2, attempts - 1)::integer)),
              updated_at = now(),
              lease_token = NULL, lease_expires_at = NULL, last_error = $3
        WHERE id = $1 AND status = 'leased' AND lease_token = $2
        RETURNING attempts`,
      [cleanupId, leaseToken, error.slice(0, 500)],
    );
    if (!rows[0]) return 'stale';
    return rows[0].attempts >= 8 ? 'dead' : 'retrying';
  }

  private async getResume(id: string): Promise<Resume> {
    const entity = await this.dataSource
      .getRepository(ResumeEntity)
      .findOne({ where: { id } });
    if (!entity)
      return Promise.reject(new NotFoundException('Resume not found'));
    return ResumeDomainOrmMapper.toDomain(entity);
  }

  private async lockResume(
    manager: EntityManager,
    id: string,
  ): Promise<ResumeRow> {
    const rows = await manager.query<ResumeRow[]>(
      `SELECT id, "userId", "cvFile", cv_version AS "cvVersion"
         FROM public.resume WHERE id = $1 FOR UPDATE`,
      [id],
    );
    if (!rows[0])
      return Promise.reject(new NotFoundException('Resume not found'));
    return rows[0];
  }

  private async enqueueCleanup(
    manager: EntityManager,
    path: string,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO public.resume_cv_cleanup (storage_bucket, object_path)
       VALUES ($2, $1) ON CONFLICT (storage_bucket, object_path) DO NOTHING`,
      [path, CV_STORAGE_BUCKET],
    );
  }

  private async pathIsReferenced(
    manager: EntityManager,
    bucket: string,
    path: string,
  ): Promise<boolean> {
    const rows = await manager.query<Array<{ referenced: boolean }>>(
      `SELECT EXISTS (
         SELECT 1 FROM public.resume WHERE $1 = $3 AND "cvFile"->>'path' = $2
       ) OR EXISTS (
         SELECT 1 FROM public.application
          WHERE $1 = $3 AND (resume_url = $2
             OR right(split_part(resume_url, '?', 1), length($2)) = $2
             OR lower(right(split_part(resume_url, '?', 1), length(replace($2, '/', '%2f'))))
                = lower(replace($2, '/', '%2f')))
       ) OR EXISTS (
         SELECT 1 FROM public.message message
          WHERE message.content_type ->> 'url' ~ '/storage/v1/object/(public|sign|authenticated)/'
            AND split_part(regexp_replace(split_part(message.content_type ->> 'url', '?', 1),
                  '^.*/storage/v1/object/(public|sign|authenticated)/', ''), '/', 1) = $1
            AND regexp_replace(regexp_replace(split_part(message.content_type ->> 'url', '?', 1),
                  '^.*/storage/v1/object/(public|sign|authenticated)/[^/]+/', ''), '%2[fF]', '/', 'g') = $2
       ) AS referenced`,
      [bucket, path, CV_STORAGE_BUCKET],
    );
    return rows[0]?.referenced ?? false;
  }

  async deleteResume(resumeId: string): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const resume = await this.lockResume(manager, resumeId);
      const reservations = await manager.query<Array<{ path: string }>>(
        `SELECT object_path AS path
           FROM public.resume_cv_upload_reservation
          WHERE resume_id = $1 AND status = 'active'
          FOR UPDATE`,
        [resumeId],
      );
      await manager.query(
        `UPDATE public.resume_cv_upload_reservation
            SET status = 'expired'
          WHERE resume_id = $1 AND status = 'active'`,
        [resumeId],
      );
      if (resume.cvFile?.path) {
        await this.enqueueCleanup(manager, resume.cvFile.path);
      }
      for (const reservation of reservations) {
        await this.enqueueCleanup(manager, reservation.path);
      }
      await manager.query(`DELETE FROM public.resume WHERE id = $1`, [
        resumeId,
      ]);
      await recordCandidateProfileChange(manager, resume.userId);
    });
  }
}

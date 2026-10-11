import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { OperationsQueueQueryDto } from '../../interfaces/dtos/admin/operations-queue.dto';

export type OperationsQueueItem = {
  id: string;
  kind:
    | 'expired_job'
    | 'application_follow_up'
    | 'organization_without_active_jobs';
  reason: 'expired_job' | 'missing_action' | 'overdue_action' | 'no_active_jobs';
  title: string;
  organizationId: string;
  organizationName: string;
  candidateId: string | null;
  candidateName: string | null;
  applicationId: string | null;
  status: string;
  stageName: string | null;
  nextAction: string | null;
  targetDate: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type OperationsQueuePage = {
  data: OperationsQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class AdminOperationsQueueService {
  constructor(private readonly dataSource: DataSource) {}

  async list(query: OperationsQueueQueryDto): Promise<OperationsQueuePage> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;
    const type = query.type ?? 'all';
    const search = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const chileDate =
      "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date";
    const conditions = `WHERE ($1 = 'all' OR queue.kind = $1)
      AND ($2::text IS NULL OR queue.title ILIKE $2 OR queue.organization_name ILIKE $2
        OR COALESCE(queue.candidate_name, '') ILIKE $2 OR COALESCE(queue.next_action, '') ILIKE $2)`;
    const fromQueue = `(
      SELECT 'expired_job'::text AS kind, job.id::text AS id, job.title,
        job."organizationId"::text AS organization_id, organization.name AS organization_name,
        NULL::text AS candidate_id, NULL::text AS candidate_name, NULL::text AS application_id,
        'expired_job'::text AS reason, job.status::text AS status,
        NULL::text AS stage_name, NULL::text AS next_action,
        NULL::date AS target_date, job."expiresAt"::date AS expires_at, job."createdAt" AS created_at
      FROM job job
      INNER JOIN organization organization ON organization.id = job."organizationId"
      WHERE job.status = 'active' AND job."expiresAt"::date < ${chileDate}
      UNION ALL
      SELECT 'application_follow_up'::text AS kind, application.id::text AS id, job.title,
        job."organizationId"::text AS organization_id, organization.name AS organization_name,
        candidate.id::text AS candidate_id, candidate.name AS candidate_name, application.id::text AS application_id,
        CASE WHEN application.next_action IS NULL OR BTRIM(application.next_action) = ''
          THEN 'missing_action' ELSE 'overdue_action' END::text AS reason,
        application.status::text AS status, stage.name AS stage_name, application.next_action,
        application.target_date, job."expiresAt"::date AS expires_at, application."createdAt" AS created_at
      FROM application application
      INNER JOIN job job ON job.id = application."jobId"
      INNER JOIN organization organization ON organization.id = job."organizationId"
      INNER JOIN "user" candidate ON candidate.id = application."candidateId"
      LEFT JOIN pipeline_stage stage ON stage.id = application.pipeline_stage_id
        AND stage.job_id = application."jobId"
      WHERE application.status NOT IN ('rechazado', 'contratado', 'desistido')
        AND (application.next_action IS NULL OR BTRIM(application.next_action) = ''
          OR application.target_date < ${chileDate})
      UNION ALL
      SELECT 'organization_without_active_jobs'::text AS kind,
        organization.id::text AS id, organization.name AS title,
        organization.id::text AS organization_id, organization.name AS organization_name,
        NULL::text AS candidate_id, NULL::text AS candidate_name, NULL::text AS application_id,
        'no_active_jobs'::text AS reason, 'none'::text AS status,
        NULL::text AS stage_name, NULL::text AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        organization."createdAt" AS created_at
      FROM organization organization
      WHERE NOT EXISTS (
        SELECT 1 FROM job active_job
        WHERE active_job."organizationId" = organization.id AND active_job.status = 'active'
      )
    ) queue`;
    const countRows = await this.dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total FROM ${fromQueue} ${conditions}`,
      [type, search],
    );
    const rows = await this.dataSource.query<OperationsQueueItem[]>(
      `SELECT queue.id, queue.kind, queue.title, queue.organization_id AS "organizationId",
        queue.organization_name AS "organizationName", queue.candidate_id AS "candidateId",
        queue.candidate_name AS "candidateName", queue.application_id AS "applicationId",
        queue.reason, queue.status, queue.stage_name AS "stageName",
        queue.next_action AS "nextAction",
        queue.target_date::text AS "targetDate", queue.expires_at::text AS "expiresAt",
        queue.created_at AS "createdAt"
       FROM ${fromQueue} ${conditions}
       ORDER BY COALESCE(queue.target_date, queue.expires_at) ASC NULLS LAST, queue.created_at ASC
       LIMIT $3 OFFSET $4`,
      [type, search, limit, offset],
    );
    const total = Number(countRows[0]?.total ?? 0);
    return {
      data: rows,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }
}

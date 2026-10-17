import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { OperationsQueueQueryDto } from '../../interfaces/dtos/admin/operations-queue.dto';

export type OperationsQueueItem = {
  id: string;
  kind:
    | 'expired_job'
    | 'application_follow_up'
    | 'organization_without_active_jobs'
    | 'organization_onboarding'
    | 'offer_response_email'
    | 'application_status_notification'
    | 'application_created_notification'
    | 'event_change_notification'
    | 'event_lifecycle_notification'
    | 'message_notification'
    | 'interview_reminder_notification'
    | 'system_broadcast_notification'
    | 'saved_search_alert'
    | 'saved_search_match'
    | 'ai_explanation';
  reason:
    | 'expired_job'
    | 'missing_action'
    | 'overdue_action'
    | 'no_active_jobs'
    | 'incomplete_onboarding'
    | 'offer_response_email_dead'
    | 'application_status_notification_dead'
    | 'application_created_notification_dead'
    | 'event_change_notification_dead'
    | 'event_lifecycle_notification_dead'
    | 'message_notification_dead'
    | 'interview_reminder_notification_dead'
    | 'system_broadcast_notification_dead'
    | 'saved_search_alert_dead'
    | 'saved_search_match_dead'
    | 'ai_explanation_dead';
  title: string;
  organizationId: string | null;
  organizationName: string | null;
  candidateId: string | null;
  candidateName: string | null;
  applicationId: string | null;
  status: string;
  statusLabel: string | null;
  attemptCount: number | null;
  stageName: string | null;
  nextAction: string | null;
  targetDate: string | null;
  expiresAt: string | null;
  createdAt: string;
  onboardingSteps: {
    corporateEmailVerified: boolean;
    profileComplete: boolean;
    legalReviewApproved: boolean;
    firstJobCreated: boolean;
  } | null;
  missingProfileFields: string[];
  assignedAdminId: string | null;
  assignedAdminName: string | null;
  assignedAdminEmail: string | null;
  assignedAt: string | null;
  assignmentActivityAction:
    'claimed' | 'released' | 'follow_up_scheduled' | null;
  assignmentActivityEmail: string | null;
  assignmentActivityAt: string | null;
  isAssignedToMe: boolean;
};

export type AdminOperationsQueueAssignmentResult =
  | { status: 'claimed' | 'already_assigned'; assignedAt: string }
  | { status: 'released' | 'follow_up_scheduled' }
  | {
      status:
        | 'assigned_elsewhere'
        | 'not_assigned'
        | 'not_assigned_to_you'
        | 'case_closed'
        | 'invalid_follow_up';
    };

export type OrganizationOnboardingAssignmentResult =
  AdminOperationsQueueAssignmentResult;

export type OperationsQueuePage = {
  data: OperationsQueueItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
};

@Injectable()
export class AdminOperationsQueueService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async list(
    query: OperationsQueueQueryDto,
    adminUserId: string | null = null,
  ): Promise<OperationsQueuePage> {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 20));
    const offset = (page - 1) * limit;
    const type = query.type ?? 'all';
    const search = query.search?.trim() ? `%${query.search.trim()}%` : null;
    const chileDate =
      "(CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date";
    const conditions = `WHERE ($1 = 'all' OR queue.kind = $1)
      AND ($2::text IS NULL OR queue.title ILIKE $2 OR queue.organization_name ILIKE $2
        OR COALESCE(queue.candidate_name, '') ILIKE $2
        OR COALESCE(task_assignment.next_action, assignment.next_action, queue.next_action, '') ILIKE $2)
      AND ($3 = 'all' OR (
        (queue.kind = 'organization_onboarding'
          AND (($3 = 'assigned' AND assignment.admin_user_id IS NOT NULL)
            OR ($3 = 'unassigned' AND assignment.admin_user_id IS NULL)))
        OR (queue.kind IN ('expired_job', 'organization_without_active_jobs')
          AND (($3 = 'assigned' AND task_assignment.assigned_admin_id IS NOT NULL)
            OR ($3 = 'unassigned' AND task_assignment.assigned_admin_id IS NULL)))
        OR (queue.kind IN ('application_status_notification', 'application_created_notification', 'event_change_notification', 'event_lifecycle_notification', 'message_notification', 'interview_reminder_notification', 'system_broadcast_notification', 'saved_search_alert', 'saved_search_match', 'ai_explanation') AND $3 = 'unassigned')))`;
    const fromQueue = `(
      SELECT 'expired_job'::text AS kind, job.id::text AS id, job.title,
        job."organizationId"::text AS organization_id, organization.name AS organization_name,
        NULL::text AS candidate_id, NULL::text AS candidate_name, NULL::text AS application_id,
        'expired_job'::text AS reason, job.status::text AS status,
        NULL::text AS stage_name, NULL::text AS next_action,
        NULL::date AS target_date, job."expiresAt"::date AS expires_at, job."createdAt" AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        NULL::text AS status_label, NULL::integer AS attempt_count
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
        application.target_date, job."expiresAt"::date AS expires_at, application."createdAt" AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        NULL::text AS status_label, NULL::integer AS attempt_count
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
        organization."createdAt" AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        NULL::text AS status_label, NULL::integer AS attempt_count
      FROM organization organization
      WHERE NOT EXISTS (
        SELECT 1 FROM job active_job
        WHERE active_job."organizationId" = organization.id AND active_job.status = 'active'
      )
      UNION ALL
      SELECT 'organization_onboarding'::text AS kind,
        organization.id::text AS id, organization.name AS title,
        organization.id::text AS organization_id, organization.name AS organization_name,
        NULL::text AS candidate_id, NULL::text AS candidate_name, NULL::text AS application_id,
        'incomplete_onboarding'::text AS reason,
        organization.verification_status::text AS status,
        NULL::text AS stage_name, NULL::text AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        organization."createdAt" AS created_at,
        jsonb_build_object(
          'corporateEmailVerified', onboarding.corporate_email_verified,
          'profileComplete', cardinality(onboarding.missing_profile_fields) = 0,
          'legalReviewApproved', onboarding.legal_review_approved,
          'firstJobCreated', onboarding.first_job_created
        ) AS onboarding_steps,
        onboarding.missing_profile_fields,
        NULL::text AS status_label, NULL::integer AS attempt_count
      FROM organization organization
      CROSS JOIN LATERAL (
        SELECT
          COALESCE(
            (
              SELECT COUNT(*) = 1 AND BOOL_OR(
                owner."isEmailVerified" IS TRUE
                AND NULLIF(SPLIT_PART(BTRIM(owner.email), '@', 2), '') IS NOT NULL
                AND LOWER(REGEXP_REPLACE(SPLIT_PART(BTRIM(owner.email), '@', 2), '\\.$', '')) =
                  LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
                    SPLIT_PART(SPLIT_PART(SPLIT_PART(
                      REGEXP_REPLACE(BTRIM(organization.website), '^https?://', '', 'i'),
                      '/', 1), '?', 1), '#', 1),
                    ':[0-9]+$', ''), '^www\\.', '', 'i'), '\\.$', ''))
              )
              FROM "user" owner
              WHERE owner."organizationId" = organization.id
            ),
            FALSE
          ) AS corporate_email_verified,
          ARRAY_REMOVE(ARRAY[
            CASE WHEN NULLIF(BTRIM(organization.name), '') IS NULL THEN 'name'::text END,
            CASE WHEN NULLIF(BTRIM(organization.website), '') IS NULL THEN 'website'::text END,
            CASE WHEN NULLIF(BTRIM(organization.description), '') IS NULL THEN 'description'::text END,
            CASE WHEN NULLIF(BTRIM(organization.industry), '') IS NULL THEN 'industry'::text END,
            CASE WHEN NULLIF(BTRIM(organization.size), '') IS NULL THEN 'size'::text END,
            CASE WHEN NULLIF(BTRIM(organization.address ->> 'city'), '') IS NULL THEN 'city'::text END,
            CASE WHEN NULLIF(BTRIM(organization.address ->> 'country'), '') IS NULL THEN 'country'::text END
          ], NULL) AS missing_profile_fields,
          organization.verification_status IS NOT DISTINCT FROM 'verified' AS legal_review_approved,
          EXISTS (
            SELECT 1 FROM job first_job
            WHERE first_job."organizationId" = organization.id
          ) AS first_job_created
      ) onboarding
      WHERE onboarding.corporate_email_verified IS NOT TRUE
        OR cardinality(onboarding.missing_profile_fields) > 0
        OR NOT onboarding.legal_review_approved
        OR NOT onboarding.first_job_created
      UNION ALL
      SELECT 'offer_response_email'::text AS kind,
        intent.id::text AS id, intent.job_title AS title,
        intent.organization_id::text AS organization_id,
        organization.name AS organization_name,
        NULL::text AS candidate_id, intent.candidate_name AS candidate_name,
        offer.application_id::text AS application_id,
        'offer_response_email_dead'::text AS reason,
        intent.status::text AS status, NULL::text AS stage_name,
        COALESCE(intent.last_error_code, 'attempt_limit_reached') AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        NULL::text AS status_label, NULL::integer AS attempt_count
      FROM offer_response_email_intent intent
      INNER JOIN organization organization ON organization.id = intent.organization_id
      INNER JOIN offer_letter offer ON offer.id = intent.offer_id
      WHERE intent.status = 'dead'
        AND intent.recipient_id IS NOT NULL
        AND intent.recipient_email IS NOT NULL
      UNION ALL
      SELECT 'message_notification'::text AS kind,
        intent.id::text AS id, 'Aviso de mensaje no entregado'::text AS title,
        chat."organizationId"::text AS organization_id,
        organization.name AS organization_name,
        intent.recipient_id::text AS candidate_id, recipient.name AS candidate_name,
        NULL::text AS application_id,
        'message_notification_dead'::text AS reason,
        intent.status::text AS status, NULL::text AS stage_name,
        intent.last_error_code AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        intent.status::text AS status_label, intent.attempt_count AS attempt_count
      FROM message_notification_intent intent
      INNER JOIN chat chat ON chat.id = intent.chat_id
      LEFT JOIN organization organization ON organization.id = chat."organizationId"
      INNER JOIN "user" recipient ON recipient.id = intent.recipient_id
      WHERE intent.status = 'dead'
      UNION ALL
      SELECT 'event_change_notification'::text AS kind,
        intent.id::text AS id, intent.event_title AS title,
        event."organizationId"::text AS organization_id,
        organization.name AS organization_name,
        intent.recipient_id::text AS candidate_id, recipient.name AS candidate_name,
        NULL::text AS application_id,
        'event_change_notification_dead'::text AS reason,
        intent.action::text AS status, NULL::text AS stage_name,
        intent.last_error_code AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        intent.action::text AS status_label, intent.attempt_count AS attempt_count
      FROM event_change_notification_intent intent
      INNER JOIN event event ON event.id = intent.event_id
      LEFT JOIN organization organization ON organization.id = event."organizationId"
      INNER JOIN "user" recipient ON recipient.id = intent.recipient_id
      WHERE intent.status = 'dead'
      UNION ALL
      SELECT 'event_lifecycle_notification'::text AS kind,
        intent.id::text AS id, intent.event_title AS title,
        event."organizationId"::text AS organization_id,
        organization.name AS organization_name,
        CASE WHEN intent.kind = 'rsvp' THEN actor.id::text ELSE recipient.id::text END AS candidate_id,
        CASE WHEN intent.kind = 'rsvp' THEN actor.name ELSE recipient.name END AS candidate_name,
        NULL::text AS application_id,
        'event_lifecycle_notification_dead'::text AS reason,
        intent.kind::text AS status, NULL::text AS stage_name,
        intent.last_error_code AS next_action,
        NULL::date AS target_date, event."startAt"::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        CASE WHEN intent.kind = 'rsvp' THEN 'event_rsvp' ELSE 'event_created' END::text AS status_label,
        intent.attempt_count AS attempt_count
      FROM event_lifecycle_notification_intent intent
      INNER JOIN event event ON event.id = intent.event_id
      INNER JOIN "user" recipient ON recipient.id = intent.recipient_id
      INNER JOIN "user" actor ON actor.id = intent.actor_user_id
      LEFT JOIN organization organization ON organization.id = event."organizationId"
      WHERE intent.status = 'dead'
      UNION ALL
      SELECT 'application_status_notification'::text AS kind,
        intent.id::text AS id, intent.job_title AS title,
        job."organizationId"::text AS organization_id,
        organization.name AS organization_name,
        intent.recipient_id::text AS candidate_id, candidate.name AS candidate_name,
        intent.application_id::text AS application_id,
        'application_status_notification_dead'::text AS reason,
        intent.status::text AS status, NULL::text AS stage_name,
        intent.last_error_code AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        intent.status_label AS status_label, intent.attempt_count AS attempt_count
      FROM application_status_notification_intent intent
      LEFT JOIN job job ON job.id = intent.job_id
      LEFT JOIN organization organization ON organization.id = job."organizationId"
      LEFT JOIN "user" candidate ON candidate.id = intent.recipient_id
      WHERE intent.status = 'dead'
      UNION ALL
      SELECT 'application_created_notification'::text AS kind,
        intent.id::text AS id, intent.job_title AS title,
        job."organizationId"::text AS organization_id,
        organization.name AS organization_name,
        intent.recipient_id::text AS candidate_id, recipient.name AS candidate_name,
        intent.application_id::text AS application_id,
        'application_created_notification_dead'::text AS reason,
        intent.status::text AS status, NULL::text AS stage_name,
        intent.last_error_code AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        'Nueva postulación'::text AS status_label, intent.attempt_count AS attempt_count
      FROM application_created_notification_intent intent
      LEFT JOIN job job ON job.id = intent.job_id
      LEFT JOIN organization organization ON organization.id = job."organizationId"
      INNER JOIN "user" recipient ON recipient.id = intent.recipient_id
      WHERE intent.status = 'dead'
      UNION ALL
      SELECT 'interview_reminder_notification'::text AS kind,
        intent.id::text AS id, event.title AS title,
        event."organizationId"::text AS organization_id,
        organization.name AS organization_name,
        recipient.id::text AS candidate_id, recipient.name AS candidate_name,
        NULL::text AS application_id,
        'interview_reminder_notification_dead'::text AS reason,
        intent.status::text AS status, NULL::text AS stage_name,
        intent.last_error_code AS next_action,
        NULL::date AS target_date, event."startAt"::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        intent.status::text AS status_label, intent.attempt_count AS attempt_count
      FROM interview_reminder_notification_intent intent
      INNER JOIN event event ON event.id = intent.event_id
      INNER JOIN event_participant participant ON participant.id = intent.participant_id
        AND participant.event_id = event.id
      INNER JOIN "user" recipient ON recipient.id = participant.user_id
      LEFT JOIN organization organization ON organization.id = event."organizationId"
      WHERE intent.status = 'dead'
        AND event.type::text = 'interview'
        AND event.status::text = 'scheduled'
        AND event."startAt" = intent.scheduled_start_at
        AND event."startAt" > now()
        AND participant.status::text <> 'declined'
        AND recipient."isActive" IS TRUE
        AND recipient.notification_preferences #>> '{channels,in_app}' IS DISTINCT FROM 'false'
        AND recipient.notification_preferences #>> '{events,interview}' IS DISTINCT FROM 'false'
      UNION ALL
      SELECT 'system_broadcast_notification'::text AS kind,
        intent.id::text AS id, broadcast.title,
        broadcast.organization_id::text AS organization_id,
        organization.name AS organization_name,
        recipient.id::text AS candidate_id, recipient.name AS candidate_name,
        NULL::text AS application_id,
        'system_broadcast_notification_dead'::text AS reason,
        intent.status::text AS status, NULL::text AS stage_name,
        intent.last_error_code AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        intent.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        intent.status::text AS status_label, intent.attempt_count AS attempt_count
      FROM system_notification_broadcast_intent intent
      INNER JOIN system_notification_broadcast broadcast ON broadcast.id = intent.broadcast_id
      INNER JOIN organization organization ON organization.id = broadcast.organization_id
      INNER JOIN "user" recipient ON recipient.id = intent.recipient_id
      WHERE intent.status = 'dead'
      UNION ALL
      SELECT 'saved_search_alert'::text AS kind,
        bucket.id::text AS id, 'Aviso de búsqueda guardada no entregado'::text AS title,
        NULL::text AS organization_id,
        STRING_AGG(DISTINCT organization.name, ', ') AS organization_name,
        bucket.recipient_id::text AS candidate_id, recipient.name AS candidate_name,
        NULL::text AS application_id,
        'saved_search_alert_dead'::text AS reason,
        bucket.status::text AS status, NULL::text AS stage_name,
        bucket.last_error_code AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        bucket.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        bucket.frequency::text AS status_label, bucket.attempt_count AS attempt_count
      FROM saved_search_alert_bucket bucket
      JOIN "user" recipient ON recipient.id = bucket.recipient_id
      JOIN saved_search_alert_bucket_item item ON item.bucket_id = bucket.id
      JOIN candidate_search_match matched ON matched.id = item.match_id
      JOIN saved_search search ON search.id = matched.saved_search_id
      JOIN organization organization ON organization.id = search.organization_id
      WHERE bucket.status = 'dead'
      GROUP BY bucket.id, recipient.id, recipient.name
      UNION ALL
      SELECT 'saved_search_match'::text AS kind,
        change.id::text AS id, 'Fallo al procesar una búsqueda de talento'::text AS title,
        NULL::text AS organization_id, NULL::text AS organization_name,
        candidate.id::text AS candidate_id, candidate.name AS candidate_name,
        NULL::text AS application_id,
        'saved_search_match_dead'::text AS reason,
        'dead'::text AS status, NULL::text AS stage_name,
        change.match_last_error AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        change.created_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        'candidate_profile_match'::text AS status_label,
        change.match_attempt_count AS attempt_count
      FROM candidate_profile_change change
      JOIN "user" candidate ON candidate.id = change.candidate_id
      WHERE change.match_failed_at IS NOT NULL
      UNION ALL
      SELECT 'ai_explanation'::text AS kind,
        score.id::text AS id, job.title,
        job."organizationId"::text AS organization_id,
        organization.name AS organization_name,
        candidate.id::text AS candidate_id, candidate.name AS candidate_name,
        score.application_id::text AS application_id,
        'ai_explanation_dead'::text AS reason,
        score.explanation_status::text AS status, NULL::text AS stage_name,
        score.error_code AS next_action,
        NULL::date AS target_date, NULL::date AS expires_at,
        score.updated_at AS created_at,
        NULL::jsonb AS onboarding_steps, ARRAY[]::text[] AS missing_profile_fields,
        score.status::text AS status_label, NULL::integer AS attempt_count
      FROM application_ai_score score
      JOIN application application ON application.id = score.application_id
      JOIN job job ON job.id = score.job_id
      JOIN organization organization ON organization.id = job."organizationId"
      JOIN "user" candidate ON candidate.id = score.candidate_id
      WHERE score.explanation_status = 'failed'
        AND score.status IN ('ready', 'insufficient')
        AND score.candidate_snapshot <> '{}'::jsonb
        AND score.candidate_snapshot_expires_at > now()
    ) queue
      LEFT JOIN organization_onboarding_assignment assignment
        ON assignment.organization_id::text = queue.organization_id
        AND queue.kind = 'organization_onboarding'
      LEFT JOIN "user" assigned_admin ON assigned_admin.id = assignment.admin_user_id`;
    const fromQueueWithActivity = `${fromQueue}
      LEFT JOIN admin_operations_queue_assignment task_assignment
        ON task_assignment.kind = queue.kind AND task_assignment.source_id::text = queue.id
        AND queue.kind IN ('expired_job', 'organization_without_active_jobs')
      LEFT JOIN "user" task_assigned_admin ON task_assigned_admin.id = task_assignment.assigned_admin_id
      LEFT JOIN LATERAL (
        SELECT action, actor_email, created_at
        FROM admin_operations_queue_assignment_audit audit
        WHERE audit.kind = queue.kind AND audit.source_id::text = queue.id
        ORDER BY audit.created_at DESC, audit.id DESC LIMIT 1
      ) task_assignment_activity ON TRUE
      LEFT JOIN LATERAL (
        SELECT action, actor_email, created_at
        FROM organization_onboarding_assignment_audit audit
        WHERE audit.organization_id::text = queue.organization_id
          AND queue.kind = 'organization_onboarding'
        ORDER BY audit.created_at DESC, audit.id DESC
        LIMIT 1
      ) assignment_activity ON TRUE`;
    const countRows = await this.dataSource.query<Array<{ total: number }>>(
      `SELECT COUNT(*)::int AS total FROM ${fromQueueWithActivity} ${conditions}`,
      [type, search, query.assignment ?? 'all'],
    );
    const rows = await this.dataSource.query<OperationsQueueItem[]>(
      `SELECT queue.id, queue.kind, queue.title, queue.organization_id AS "organizationId",
        queue.organization_name AS "organizationName", queue.candidate_id AS "candidateId",
        queue.candidate_name AS "candidateName", queue.application_id AS "applicationId",
        queue.reason, queue.status, queue.status_label AS "statusLabel",
        queue.attempt_count AS "attemptCount", queue.stage_name AS "stageName",
        COALESCE(task_assignment.next_action, assignment.next_action, queue.next_action) AS "nextAction",
        COALESCE(task_assignment.target_date, assignment.target_date, queue.target_date)::text AS "targetDate",
        queue.expires_at::text AS "expiresAt",
        queue.created_at AS "createdAt", queue.onboarding_steps AS "onboardingSteps",
        queue.missing_profile_fields AS "missingProfileFields",
        COALESCE(task_assignment.assigned_admin_id, assignment.admin_user_id) AS "assignedAdminId",
        COALESCE(task_assignment.assigned_admin_id = $4::uuid, assignment.admin_user_id = $4::uuid, FALSE) AS "isAssignedToMe",
        COALESCE(task_assigned_admin.name, assigned_admin.name) AS "assignedAdminName",
        COALESCE(task_assigned_admin.email, assigned_admin.email) AS "assignedAdminEmail",
        COALESCE(task_assignment.assigned_at, assignment.assigned_at)::text AS "assignedAt",
        COALESCE(task_assignment_activity.action, assignment_activity.action) AS "assignmentActivityAction",
        COALESCE(task_assignment_activity.actor_email, assignment_activity.actor_email) AS "assignmentActivityEmail",
        COALESCE(task_assignment_activity.created_at, assignment_activity.created_at)::text AS "assignmentActivityAt"
       FROM ${fromQueueWithActivity} ${conditions}
       ORDER BY COALESCE(task_assignment.target_date, assignment.target_date, queue.target_date, queue.expires_at) ASC NULLS LAST,
         queue.created_at ASC
       LIMIT $5 OFFSET $6`,
      [type, search, query.assignment ?? 'all', adminUserId, limit, offset],
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

  async retryDeadOfferResponseEmail(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT attempt_count AS "attemptCount"
         FROM offer_response_email_intent
         WHERE id = $1::uuid AND status = 'dead'
           AND recipient_id IS NOT NULL AND recipient_email IS NOT NULL
         FOR UPDATE`,
        [intentId],
      );
      if (retryable.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE offer_response_email_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
           AND recipient_id IS NOT NULL AND recipient_email IS NOT NULL
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO offer_response_email_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, retryable[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadApplicationStatusNotification(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT intent.attempt_count AS "attemptCount"
         FROM application_status_notification_intent intent
         WHERE intent.id = $1::uuid AND intent.status = 'dead'
           AND EXISTS (
             SELECT 1 FROM "user" recipient WHERE recipient.id = intent.recipient_id
           )
         FOR UPDATE`,
        [intentId],
      );
      if (retryable.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE application_status_notification_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO application_status_notification_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, retryable[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadApplicationCreatedNotification(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT attempt_count AS "attemptCount"
         FROM application_created_notification_intent
         WHERE id = $1::uuid AND status = 'dead'
           AND EXISTS (SELECT 1 FROM "user" WHERE id = recipient_id)
         FOR UPDATE`,
        [intentId],
      );
      if (retryable.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE application_created_notification_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO application_created_notification_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, retryable[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadEventChangeNotification(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT attempt_count AS "attemptCount"
         FROM event_change_notification_intent
         WHERE id = $1::uuid AND status = 'dead'
           AND EXISTS (SELECT 1 FROM "user" WHERE id = recipient_id)
         FOR UPDATE`,
        [intentId],
      );
      if (retryable.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE event_change_notification_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO event_change_notification_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, retryable[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadEventLifecycleNotification(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const references = await manager.query<
        Array<{
          eventId: string;
          participantId: string;
          recipientId: string;
          actorUserId: string;
          kind: 'created' | 'rsvp';
          toStatus: string | null;
        }>
      >(
        `SELECT event_id AS "eventId", participant_id AS "participantId",
                recipient_id AS "recipientId", actor_user_id AS "actorUserId",
                kind, to_status AS "toStatus"
         FROM event_lifecycle_notification_intent
         WHERE id = $1::uuid AND status = 'dead'`,
        [intentId],
      );
      const reference = references[0];
      if (!reference) return 'not_retryable';

      const events = await manager.query<Array<{ status: string }>>(
        `SELECT status::text AS status
         FROM event
         WHERE id = $1::uuid AND "startAt" > now()
         FOR SHARE`,
        [reference.eventId],
      );
      if (events[0]?.status !== 'scheduled') return 'not_retryable';

      const participants = await manager.query<
        Array<{
          status: string;
          isActive: boolean;
          inAppEnabled: boolean;
          interviewEnabled: boolean;
        }>
      >(
        `SELECT participant.status::text AS status,
                recipient."isActive" AS "isActive",
                recipient.notification_preferences #>> '{channels,in_app}' IS DISTINCT FROM 'false' AS "inAppEnabled",
                recipient.notification_preferences #>> '{events,interview}' IS DISTINCT FROM 'false' AS "interviewEnabled"
         FROM event_participant participant
         JOIN "user" recipient ON recipient.id = $4::uuid
         WHERE participant.id = $1::uuid AND participant.event_id = $2::uuid
           AND participant.user_id = CASE WHEN $3::text = 'rsvp' THEN $5::uuid ELSE $4::uuid END
         FOR SHARE OF participant, recipient`,
        [
          reference.participantId,
          reference.eventId,
          reference.kind,
          reference.recipientId,
          reference.actorUserId,
        ],
      );
      const participant = participants[0];
      if (
        !participant ||
        !participant.isActive ||
        !participant.inAppEnabled ||
        !participant.interviewEnabled ||
        (reference.kind === 'created' && participant.status === 'declined') ||
        (reference.kind === 'rsvp' && participant.status !== reference.toStatus)
      ) {
        return 'not_retryable';
      }

      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT attempt_count AS "attemptCount"
         FROM event_lifecycle_notification_intent
         WHERE id = $1::uuid AND status = 'dead'
         FOR UPDATE`,
        [intentId],
      );
      const intent = retryable[0];
      if (!intent) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE event_lifecycle_notification_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO event_lifecycle_notification_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, intent.attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadMessageNotification(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT attempt_count AS "attemptCount"
         FROM message_notification_intent
         WHERE id = $1::uuid AND status = 'dead'
           AND EXISTS (SELECT 1 FROM "user" WHERE id = recipient_id)
           AND EXISTS (SELECT 1 FROM message WHERE id = message_id)
         FOR UPDATE`,
        [intentId],
      );
      if (retryable.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE message_notification_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO message_notification_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, retryable[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadInterviewReminderNotification(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const references = await manager.query<Array<{ eventId: string }>>(
        `SELECT event_id AS "eventId"
         FROM interview_reminder_notification_intent
         WHERE id = $1::uuid AND status = 'dead'`,
        [intentId],
      );
      const eventId = references[0]?.eventId;
      if (!eventId) return 'not_retryable';

      const events = await manager.query<
        Array<{ id: string; startAt: Date; type: string; status: string }>
      >(
        `SELECT id, "startAt" AS "startAt", type::text AS type, status::text AS status
         FROM event WHERE id = $1::uuid FOR SHARE`,
        [eventId],
      );
      const event = events[0];
      if (!event) return 'not_retryable';

      const retryable = await manager.query<
        Array<{
          eventId: string;
          participantId: string;
          scheduledStartAt: Date;
          attemptCount: number;
        }>
      >(
        `SELECT event_id AS "eventId", participant_id AS "participantId",
                scheduled_start_at AS "scheduledStartAt",
                attempt_count AS "attemptCount"
         FROM interview_reminder_notification_intent
         WHERE id = $1::uuid AND status = 'dead'
         FOR UPDATE`,
        [intentId],
      );
      const intent = retryable[0];
      if (
        !intent ||
        intent.eventId !== event.id ||
        event.type !== 'interview' ||
        event.status !== 'scheduled' ||
        event.startAt.getTime() !==
          new Date(intent.scheduledStartAt).getTime() ||
        event.startAt.getTime() <= Date.now()
      ) {
        return 'not_retryable';
      }

      const participants = await manager.query<
        Array<{
          status: string;
          isActive: boolean;
          inAppEnabled: boolean;
          interviewEnabled: boolean;
        }>
      >(
        `SELECT participant.status::text AS status, recipient."isActive" AS "isActive",
                recipient.notification_preferences #>> '{channels,in_app}' IS DISTINCT FROM 'false' AS "inAppEnabled",
                recipient.notification_preferences #>> '{events,interview}' IS DISTINCT FROM 'false' AS "interviewEnabled"
         FROM event_participant participant
         JOIN "user" recipient ON recipient.id = participant.user_id
         WHERE participant.id = $1::uuid AND participant.event_id = $2::uuid
         FOR SHARE OF participant, recipient`,
        [intent.participantId, intent.eventId],
      );
      const participant = participants[0];
      if (
        !participant ||
        participant.status === 'declined' ||
        !participant.isActive ||
        !participant.inAppEnabled ||
        !participant.interviewEnabled
      ) {
        return 'not_retryable';
      }

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE interview_reminder_notification_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO interview_reminder_notification_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, intent.attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadSystemBroadcastNotification(
    intentId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT intent.attempt_count AS "attemptCount"
         FROM system_notification_broadcast_intent intent
         JOIN system_notification_broadcast broadcast ON broadcast.id = intent.broadcast_id
         JOIN "user" recipient ON recipient.id = intent.recipient_id
         WHERE intent.id = $1::uuid AND intent.status = 'dead'
           AND recipient."isActive" IS TRUE
           AND recipient.notification_preferences #>> '{channels,in_app}' IS DISTINCT FROM 'false'
           AND recipient.notification_preferences #>> '{events,system}' IS DISTINCT FROM 'false'
           AND (recipient."organizationId" = broadcast.organization_id OR EXISTS (
             SELECT 1 FROM organization_member member
             WHERE member.organization_id = broadcast.organization_id
               AND member.user_id = recipient.id
           ))
         FOR UPDATE OF intent`,
        [intentId],
      );
      if (retryable.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE system_notification_broadcast_intent
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [intentId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO system_notification_broadcast_admin_retry
          (intent_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [intentId, adminUserId, retryable[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryDeadSavedSearchAlertBucket(
    bucketId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const retryable = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT attempt_count AS "attemptCount"
         FROM saved_search_alert_bucket
         WHERE id = $1::uuid AND status = 'dead'
         FOR UPDATE`,
        [bucketId],
      );
      if (retryable.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE saved_search_alert_bucket
         SET status = 'pending', attempt_count = 0, available_at = now(),
             locked_at = NULL, last_error_code = NULL, updated_at = now()
         WHERE id = $1::uuid AND status = 'dead'
         RETURNING id`,
        [bucketId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO saved_search_alert_admin_retry
          (bucket_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [bucketId, adminUserId, retryable[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryFailedSavedSearchMatch(
    changeId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const failed = await manager.query<Array<{ attemptCount: number }>>(
        `SELECT match_attempt_count AS "attemptCount"
         FROM candidate_profile_change
         WHERE id = $1::uuid AND processed_at IS NULL AND match_failed_at IS NOT NULL
         FOR UPDATE`,
        [changeId],
      );
      if (failed.length === 0) return 'not_retryable';

      const requeued = await manager.query<Array<{ id: string }>>(
        `UPDATE candidate_profile_change
         SET match_attempt_count = 0, match_last_error = NULL, match_failed_at = NULL
         WHERE id = $1::uuid AND processed_at IS NULL AND match_failed_at IS NOT NULL
         RETURNING id`,
        [changeId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO candidate_profile_change_admin_retry
          (profile_change_id, actor_user_id, previous_attempt_count)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [changeId, adminUserId, failed[0].attemptCount],
      );
      return 'requeued';
    });
  }

  async retryFailedAiExplanation(
    revisionId: string,
    adminUserId: string,
  ): Promise<'requeued' | 'not_retryable'> {
    return this.dataSource.transaction(async manager => {
      const requeued = await manager.query<
        Array<{ id: string; errorCode: string | null }>
      >(
        `WITH failed AS (
           SELECT id, error_code
           FROM application_ai_score
           WHERE id = $1::uuid AND explanation_status = 'failed'
             AND status IN ('ready', 'insufficient')
             AND candidate_snapshot <> '{}'::jsonb
             AND candidate_snapshot_expires_at > now()
           FOR UPDATE
         ), reset AS (
           UPDATE application_ai_score AS score
           SET explanation_status = 'pending', explanation = NULL,
               error_code = NULL, lease_token = NULL, lease_until = NULL,
               updated_at = now()
           FROM failed
           WHERE score.id = failed.id
           RETURNING score.id, failed.error_code AS "errorCode"
         )
         SELECT id, "errorCode" FROM reset`,
        [revisionId],
      );
      if (requeued.length === 0) return 'not_retryable';

      await manager.query(
        `INSERT INTO application_ai_explanation_admin_retry
          (revision_id, actor_user_id, previous_error_code)
         VALUES ($1::uuid, $2::uuid, $3)`,
        [revisionId, adminUserId, requeued[0].errorCode],
      );
      return 'requeued';
    });
  }

  async updateAdminTaskAssignment(input: {
    kind: 'expired_job' | 'organization_without_active_jobs';
    sourceId: string;
    adminUserId: string;
    actorEmail: string;
    action: 'claim' | 'schedule_follow_up' | 'release';
    nextAction?: string;
    targetDate?: string;
  }): Promise<AdminOperationsQueueAssignmentResult> {
    const nextAction = input.nextAction?.trim();
    if (input.action !== 'release' && (!nextAction || !input.targetDate)) {
      return { status: 'invalid_follow_up' };
    }

    return this.dataSource.transaction(async manager => {
      const eligible =
        input.kind === 'expired_job'
          ? await manager.query<Array<{ id: string }>>(
              `SELECT id FROM job WHERE id = $1::uuid AND status = 'active'
             AND "expiresAt"::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date
             FOR UPDATE`,
              [input.sourceId],
            )
          : await manager.query<Array<{ id: string }>>(
              `SELECT organization.id FROM organization organization
             WHERE organization.id = $1::uuid AND NOT EXISTS (
               SELECT 1 FROM job active_job
               WHERE active_job."organizationId" = organization.id AND active_job.status = 'active'
             ) FOR UPDATE OF organization`,
              [input.sourceId],
            );
      if (eligible.length === 0) return { status: 'case_closed' };

      if (input.action === 'claim') {
        const claimed = await manager.query<Array<{ assignedAt: string }>>(
          `INSERT INTO admin_operations_queue_assignment
             (kind, source_id, assigned_admin_id, assigned_at, next_action, target_date, updated_at)
           VALUES ($1, $2::uuid, $3::uuid, now(), $4, $5::date, now())
           ON CONFLICT (kind, source_id) DO UPDATE
             SET assigned_admin_id = EXCLUDED.assigned_admin_id, assigned_at = EXCLUDED.assigned_at,
                 next_action = EXCLUDED.next_action, target_date = EXCLUDED.target_date, updated_at = now()
             WHERE admin_operations_queue_assignment.assigned_admin_id IS NULL
           RETURNING assigned_at::text AS "assignedAt"`,
          [
            input.kind,
            input.sourceId,
            input.adminUserId,
            nextAction,
            input.targetDate,
          ],
        );
        if (claimed[0]) {
          await this.insertTaskAssignmentAudit(
            manager,
            input,
            'claimed',
            null,
            null,
            nextAction,
            input.targetDate,
          );
          return { status: 'claimed', assignedAt: claimed[0].assignedAt };
        }
        const current = await manager.query<
          Array<{ adminUserId: string; assignedAt: string }>
        >(
          `SELECT assigned_admin_id AS "adminUserId", assigned_at::text AS "assignedAt"
           FROM admin_operations_queue_assignment
           WHERE kind = $1 AND source_id = $2::uuid`,
          [input.kind, input.sourceId],
        );
        return current[0]?.adminUserId === input.adminUserId
          ? { status: 'already_assigned', assignedAt: current[0].assignedAt }
          : { status: 'assigned_elsewhere' };
      }

      const current = await manager.query<
        Array<{
          adminUserId: string | null;
          nextAction: string | null;
          targetDate: string | null;
        }>
      >(
        `SELECT assigned_admin_id AS "adminUserId", next_action AS "nextAction",
           target_date::text AS "targetDate"
         FROM admin_operations_queue_assignment WHERE kind = $1 AND source_id = $2::uuid FOR UPDATE`,
        [input.kind, input.sourceId],
      );
      const prior = current[0];
      if (!prior?.adminUserId) return { status: 'not_assigned' };
      if (prior.adminUserId !== input.adminUserId)
        return { status: 'not_assigned_to_you' };

      if (input.action === 'schedule_follow_up') {
        await manager.query(
          `UPDATE admin_operations_queue_assignment SET next_action = $3, target_date = $4::date, updated_at = now()
           WHERE kind = $1 AND source_id = $2::uuid`,
          [input.kind, input.sourceId, nextAction, input.targetDate],
        );
        await this.insertTaskAssignmentAudit(
          manager,
          input,
          'follow_up_scheduled',
          prior.nextAction,
          prior.targetDate,
          nextAction,
          input.targetDate,
        );
        return { status: 'follow_up_scheduled' };
      }

      await manager.query(
        `UPDATE admin_operations_queue_assignment SET assigned_admin_id = NULL, assigned_at = NULL,
           next_action = NULL, target_date = NULL, updated_at = now()
         WHERE kind = $1 AND source_id = $2::uuid`,
        [input.kind, input.sourceId],
      );
      await this.insertTaskAssignmentAudit(
        manager,
        input,
        'released',
        prior.nextAction,
        prior.targetDate,
        null,
        null,
      );
      return { status: 'released' };
    });
  }

  private async insertTaskAssignmentAudit(
    manager: import('typeorm').EntityManager,
    input: {
      kind: 'expired_job' | 'organization_without_active_jobs';
      sourceId: string;
      adminUserId: string;
      actorEmail: string;
    },
    action: 'claimed' | 'released' | 'follow_up_scheduled',
    previousNextAction: string | null,
    previousTargetDate: string | null,
    nextAction: string | null | undefined,
    targetDate: string | null | undefined,
  ): Promise<void> {
    await manager.query(
      `INSERT INTO admin_operations_queue_assignment_audit
         (kind, source_id, actor_user_id, actor_email, action, previous_next_action,
          previous_target_date, next_action, target_date)
       VALUES ($1, $2::uuid, $3::uuid, $4, $5, $6, $7::date, $8, $9::date)`,
      [
        input.kind,
        input.sourceId,
        input.adminUserId,
        input.actorEmail,
        action,
        previousNextAction,
        previousTargetDate,
        nextAction ?? null,
        targetDate ?? null,
      ],
    );
  }

  async updateOnboardingAssignment(input: {
    organizationId: string;
    adminUserId: string;
    actorEmail: string;
    action: 'claim' | 'schedule_follow_up' | 'release';
    nextAction?: string;
    targetDate?: string;
  }): Promise<OrganizationOnboardingAssignmentResult> {
    return this.dataSource.transaction(async manager => {
      const openCases = await manager.query<Array<{ id: string }>>(
        `SELECT organization.id
         FROM organization organization
         WHERE organization.id = $1
           AND (
             NOT EXISTS (
               SELECT 1 FROM "user" owner
               WHERE owner."organizationId" = organization.id
                 AND owner."isEmailVerified" IS TRUE
                 AND LOWER(REGEXP_REPLACE(SPLIT_PART(BTRIM(owner.email), '@', 2), '\\.$', '')) =
                   LOWER(REGEXP_REPLACE(REGEXP_REPLACE(REGEXP_REPLACE(
                     SPLIT_PART(SPLIT_PART(SPLIT_PART(
                       REGEXP_REPLACE(BTRIM(organization.website), '^https?://', '', 'i'),
                       '/', 1), '?', 1), '#', 1),
                     ':[0-9]+$', ''), '^www\\.', '', 'i'), '\\.$', ''))
             )
             OR NULLIF(BTRIM(organization.name), '') IS NULL
             OR NULLIF(BTRIM(organization.website), '') IS NULL
             OR NULLIF(BTRIM(organization.description), '') IS NULL
             OR NULLIF(BTRIM(organization.industry), '') IS NULL
             OR NULLIF(BTRIM(organization.size), '') IS NULL
             OR NULLIF(BTRIM(organization.address ->> 'city'), '') IS NULL
             OR NULLIF(BTRIM(organization.address ->> 'country'), '') IS NULL
             OR organization.verification_status IS DISTINCT FROM 'verified'
             OR NOT EXISTS (
               SELECT 1 FROM job onboarding_job
               WHERE onboarding_job."organizationId" = organization.id
             )
           )
         FOR UPDATE OF organization`,
        [input.organizationId],
      );
      if (openCases.length === 0) return { status: 'case_closed' };

      const nextAction = input.nextAction?.trim();
      if (input.action !== 'release' && (!nextAction || !input.targetDate)) {
        return { status: 'invalid_follow_up' };
      }

      if (input.action === 'claim') {
        const claimed = await manager.query<Array<{ assignedAt: string }>>(
          `INSERT INTO organization_onboarding_assignment
             (organization_id, admin_user_id, assigned_at, next_action, target_date, updated_at)
           VALUES ($1, $2, now(), $3, $4::date, now())
           ON CONFLICT (organization_id) DO UPDATE
             SET admin_user_id = EXCLUDED.admin_user_id,
                 assigned_at = EXCLUDED.assigned_at,
                 next_action = EXCLUDED.next_action,
                 target_date = EXCLUDED.target_date,
                 updated_at = now()
             WHERE organization_onboarding_assignment.admin_user_id IS NULL
          RETURNING assigned_at::text AS "assignedAt"`,
          [
            input.organizationId,
            input.adminUserId,
            nextAction,
            input.targetDate,
          ],
        );
        if (claimed[0]) {
          await manager.query(
            `INSERT INTO organization_onboarding_assignment_audit
               (organization_id, actor_id, actor_email, action, next_action, target_date)
             VALUES ($1, $2, $3, 'claimed', $4, $5::date)`,
            [
              input.organizationId,
              input.adminUserId,
              input.actorEmail,
              nextAction,
              input.targetDate,
            ],
          );
          return { status: 'claimed', assignedAt: claimed[0].assignedAt };
        }
        const current = await manager.query<
          Array<{ adminUserId: string; assignedAt: string }>
        >(
          `SELECT admin_user_id AS "adminUserId", assigned_at::text AS "assignedAt"
           FROM organization_onboarding_assignment
           WHERE organization_id = $1`,
          [input.organizationId],
        );
        if (current[0]?.adminUserId === input.adminUserId) {
          return {
            status: 'already_assigned',
            assignedAt: current[0].assignedAt,
          };
        }
        return { status: 'assigned_elsewhere' };
      }

      if (input.action === 'schedule_follow_up') {
        const updated = await manager.query<
          Array<{
            previousNextAction: string | null;
            previousTargetDate: string | null;
          }>
        >(
          `WITH prior AS (
             SELECT next_action, target_date
             FROM organization_onboarding_assignment
             WHERE organization_id = $1 AND admin_user_id = $2
             FOR UPDATE
           )
           UPDATE organization_onboarding_assignment assignment
           SET next_action = $3, target_date = $4::date, updated_at = now()
           FROM prior
           WHERE assignment.organization_id = $1 AND assignment.admin_user_id = $2
           RETURNING prior.next_action AS "previousNextAction",
             prior.target_date::text AS "previousTargetDate"`,
          [
            input.organizationId,
            input.adminUserId,
            nextAction,
            input.targetDate,
          ],
        );
        if (updated.length === 0) {
          const current = await manager.query<
            Array<{ adminUserId: string | null }>
          >(
            `SELECT admin_user_id AS "adminUserId"
             FROM organization_onboarding_assignment WHERE organization_id = $1`,
            [input.organizationId],
          );
          return current[0]?.adminUserId
            ? { status: 'not_assigned_to_you' }
            : { status: 'not_assigned' };
        }
        await manager.query(
          `INSERT INTO organization_onboarding_assignment_audit
             (organization_id, actor_id, actor_email, action, previous_next_action,
              previous_target_date, next_action, target_date)
           VALUES ($1, $2, $3, 'follow_up_scheduled', $4, $5::date, $6, $7::date)`,
          [
            input.organizationId,
            input.adminUserId,
            input.actorEmail,
            updated[0].previousNextAction,
            updated[0].previousTargetDate,
            nextAction,
            input.targetDate,
          ],
        );
        return { status: 'follow_up_scheduled' };
      }

      const released = await manager.query<
        Array<{
          organizationId: string;
          nextAction: string | null;
          targetDate: string | null;
        }>
      >(
        `WITH prior AS (
           SELECT next_action, target_date
           FROM organization_onboarding_assignment
           WHERE organization_id = $1 AND admin_user_id = $2
           FOR UPDATE
         )
         UPDATE organization_onboarding_assignment assignment
         SET admin_user_id = NULL, assigned_at = NULL, next_action = NULL, target_date = NULL,
             updated_at = now()
         FROM prior
         WHERE assignment.organization_id = $1 AND assignment.admin_user_id = $2
         RETURNING assignment.organization_id AS "organizationId",
           prior.next_action AS "nextAction", prior.target_date::text AS "targetDate"`,
        [input.organizationId, input.adminUserId],
      );
      if (released.length === 0) {
        return { status: 'not_assigned_to_you' };
      }
      await manager.query(
        `INSERT INTO organization_onboarding_assignment_audit
           (organization_id, actor_id, actor_email, action, previous_next_action, previous_target_date)
         VALUES ($1, $2, $3, 'released', $4, $5::date)`,
        [
          input.organizationId,
          input.adminUserId,
          input.actorEmail,
          released[0].nextAction,
          released[0].targetDate,
        ],
      );
      return { status: 'released' };
    });
  }
}

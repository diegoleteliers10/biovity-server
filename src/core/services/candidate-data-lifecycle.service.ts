import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';

type CandidateRow = {
  id: string;
  email: string;
  application_count: number;
};

type CandidateExport = {
  candidate: Record<string, unknown>;
  profileSnapshots: Record<string, unknown>[];
  resumes: Record<string, unknown>[];
  applications: Record<string, unknown>[];
  answers: Record<string, unknown>[];
  evaluations: Record<string, unknown>[];
  notes: Record<string, unknown>[];
  statusHistory: Record<string, unknown>[];
  events: Record<string, unknown>[];
  eventParticipants: Record<string, unknown>[];
  participantStatusHistory: Record<string, unknown>[];
  interviewEvaluations: Record<string, unknown>[];
  interviewOutcomes: Record<string, unknown>[];
  interviewAudit: Record<string, unknown>[];
  eventNotes: Record<string, unknown>[];
  eventChangeHistory: Record<string, unknown>[];
  eventInterviewers: Record<string, unknown>[];
  aiScores: Record<string, unknown>[];
  offers: Record<string, unknown>[];
  alerts: Record<string, unknown>[];
  savedJobs: Record<string, unknown>[];
  chats: Record<string, unknown>[];
  messages: Record<string, unknown>[];
  notifications: Record<string, unknown>[];
  savedCandidates: Record<string, unknown>[];
  candidateTags: Record<string, unknown>[];
  emailOutbox: Record<string, unknown>[];
  activity: Record<string, unknown>[];
  aiInteractions: Record<string, unknown>[];
  capsuleProgress: Record<string, unknown>[];
  capsuleModuleProgress: Record<string, unknown>[];
  certificates: Record<string, unknown>[];
  calendarConnections: Record<string, unknown>[];
  calendarOauthStates: Record<string, unknown>[];
  notificationIntents: Record<string, unknown>[];
  emailOutboxAdminRetries: Record<string, unknown>[];
};

const CV_STORAGE_BUCKET = process.env.SUPABASE_CV_BUCKET ?? 'biovity_cv';
const APP_STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? 'biovity_bucket';

const ELIGIBLE_CANDIDATES = `
  WITH application_closures AS (
    SELECT a."candidateId" AS candidate_id,
           a.id AS application_id,
           COALESCE(
             (SELECT h.changed_at
                FROM public.application_status_history h
               WHERE h.application_id = a.id
                 AND h.new_status = a.status::text
               ORDER BY h.changed_at DESC, h.id DESC
               LIMIT 1),
             a."updatedAt"
           ) AS closed_at
      FROM public.application a
     WHERE a.status::text IN ('contratado', 'rechazado', 'desistido')
  ),
  candidate_closures AS (
    SELECT candidate_id,
           max(closed_at) AS last_closed_at,
           count(*)::integer AS application_count
      FROM application_closures
     GROUP BY candidate_id
  )
  SELECT u.id, u.email, c.application_count
    FROM candidate_closures c
    JOIN public."user" u ON u.id = c.candidate_id
   WHERE u.type::text = 'professional'
     AND c.last_closed_at <= now() - interval '24 months'
     AND NOT EXISTS (
       SELECT 1
         FROM public.application open_application
        WHERE open_application."candidateId" = u.id
          AND open_application.status::text NOT IN ('contratado', 'rechazado', 'desistido')
     )
   ORDER BY c.last_closed_at, u.id
   LIMIT $1
   FOR UPDATE OF u SKIP LOCKED`;

@Injectable()
export class CandidateDataLifecycleService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async exportCandidateData(
    candidateId: string,
    actorUserId: string,
  ): Promise<CandidateExport> {
    return this.dataSource.transaction(async manager => {
      const candidates = await manager.query<Array<Record<string, unknown>>>(
        `SELECT id, email, name, type, "isEmailVerified", "isActive", avatar,
                profession, birthday, phone, location, "experienceLevel", availability,
                "createdAt", "updatedAt"
           FROM public."user"
          WHERE id = $1 AND type::text = 'professional'`,
        [candidateId],
      );
      const candidate = candidates[0];
      if (!candidate)
        return Promise.reject(new NotFoundException('Candidate not found'));

      const profileSnapshots = await manager.query<
        Array<Record<string, unknown>>
      >(
        `SELECT to_jsonb(change) AS record
           FROM public.candidate_profile_change change
          WHERE change.candidate_id = $1
          ORDER BY change.created_at, change.id`,
        [candidateId],
      );

      const [resumes, applications] = await Promise.all([
        manager.query<Array<Record<string, unknown>>>(
          `SELECT id, summary, experiences, education, skills, certifications, languages,
                  links, "cvFile"::jsonb - 'path' AS "cvFile", "createdAt", "updatedAt"
             FROM public.resume
            WHERE "userId" = $1
            ORDER BY "createdAt", id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(a) AS record
             FROM public.application a
            WHERE a."candidateId" = $1
            ORDER BY a."createdAt", a.id`,
          [candidateId],
        ),
      ]);
      const [
        alerts,
        savedJobs,
        chats,
        messages,
        notifications,
        savedCandidates,
        candidateTags,
        activity,
        aiInteractions,
        capsuleProgress,
        capsuleModuleProgress,
        certificates,
        calendarConnections,
        calendarOauthStates,
        notificationIntents,
      ] = await Promise.all([
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(alert) AS record FROM public.job_alert alert
            WHERE alert.user_id = $1 ORDER BY alert.created_at, alert.id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(saved) AS record FROM public.saved_job saved
            WHERE saved."userId" = $1 ORDER BY saved."createdAt", saved.id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(chat) AS record FROM public.chat chat
            WHERE chat."professionalId" = $1 ORDER BY chat."createdAt", chat.id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(message) AS record FROM public.message message
            JOIN public.chat chat ON chat.id = message."chatId"
            WHERE chat."professionalId" = $1 ORDER BY message."createdAt", message.id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(notification) AS record FROM public.notification notification
            WHERE notification.user_id = $1 ORDER BY notification.created_at, notification.id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.saved_candidate row
            WHERE row.candidate_id = $1`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.candidate_tag_assignment row
            WHERE row.candidate_id = $1`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.activity_log row
              WHERE row.user_id = $1 ORDER BY row.created_at, row.id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.ai_interaction_logs row
              WHERE row.user_id = $1::text ORDER BY row.created_at, row.id`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.capsule_progress row
              WHERE row.user_id = $1`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.capsule_module_progress row
              WHERE row.user_id = $1`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.certificates row
              WHERE row.user_id = $1`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT jsonb_build_object(
                'owner_type', row.owner_type, 'owner_id', row.owner_id,
                'account_email', row.account_email, 'calendar_id', row.calendar_id,
                'connected_at', row.connected_at, 'updated_at', row.updated_at
              ) AS record FROM public.google_calendar_connection row
              WHERE row.owner_type = 'user' AND row.owner_id = $1`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT jsonb_build_object(
                'created_by_user_id', row.created_by_user_id,
                'owner_type', row.owner_type, 'owner_id', row.owner_id,
                'expires_at', row.expires_at
              ) AS record FROM public.google_calendar_oauth_state row
              WHERE row.created_by_user_id = $1 OR (row.owner_type = 'user' AND row.owner_id = $1)`,
          [candidateId],
        ),
        manager.query<Array<Record<string, unknown>>>(
          `SELECT to_jsonb(row) AS record FROM public.application_status_notification_intent row
              WHERE row.recipient_id = $1 OR row.application_id IN (
                SELECT application.id FROM public.application WHERE application."candidateId" = $1
              )
              UNION ALL
              SELECT to_jsonb(row) AS record FROM public.application_created_notification_intent row
              WHERE row.application_id IN (
                SELECT application.id FROM public.application WHERE application."candidateId" = $1
              )
              UNION ALL
              SELECT to_jsonb(row) AS record FROM public.message_notification_intent row
              WHERE row.recipient_id = $1 OR row.chat_id IN (
                SELECT chat.id FROM public.chat WHERE chat."professionalId" = $1
              )
              UNION ALL
              SELECT to_jsonb(row) AS record FROM public.event_change_notification_intent row
              WHERE row.event_id IN (
                SELECT event.id FROM public.event event
                WHERE event."candidateId" = $1 OR event."organizerId" = $1
              )
              UNION ALL
              SELECT to_jsonb(row) AS record FROM public.event_lifecycle_notification_intent row
              WHERE row.recipient_id = $1 OR row.actor_user_id = $1
              UNION ALL
              SELECT to_jsonb(row) AS record FROM public.interview_reminder_notification_intent row
              WHERE row.participant_id IN (
                SELECT participant.id FROM public.event_participant participant
                WHERE participant.user_id = $1
              )
              UNION ALL
              SELECT to_jsonb(row) AS record FROM public.system_notification_broadcast_intent row
              WHERE row.recipient_id = $1`,
          [candidateId],
        ),
      ]);
      const applicationIds = applications.map(
        row => (row.record as { id: string }).id,
      );
      const children = await this.applicationExportRows(
        manager,
        applicationIds,
        candidateId,
      );
      const offers = children.offers.map(row => row as { id?: string });
      const sourceIds = [
        ...applicationIds,
        ...offers.flatMap(offer => (offer.id ? [offer.id] : [])),
        ...children.events.flatMap(event => {
          const id = (event as { id?: string }).id;
          return id ? [id] : [];
        }),
      ];
      const offerResponseKeys = offers.flatMap(offer =>
        offer.id ? [`offer-response:${offer.id}`] : [],
      );
      const sourceEmailOutbox = await manager.query<
        Array<Record<string, unknown>>
      >(
        `SELECT to_jsonb(outbox) AS record FROM public.email_outbox outbox
          WHERE outbox.recipient_user_id = $1
             OR lower(outbox.recipient_email) = lower($2)
             OR outbox.source_id = ANY($3::uuid[])
             OR outbox.idempotency_key = ANY($4::text[])
          ORDER BY outbox.created_at, outbox.id`,
        [candidateId, candidate.email, sourceIds, offerResponseKeys],
      );
      const emailOutboxIds = sourceEmailOutbox.flatMap(row => {
        const record = row.record as { id?: string };
        return record.id ? [record.id] : [];
      });
      const emailOutboxAdminRetries = await manager.query<
        Array<Record<string, unknown>>
      >(
        `SELECT to_jsonb(retry) AS record
           FROM public.email_outbox_admin_retry retry
          WHERE retry.email_outbox_id = ANY($1::uuid[])
          ORDER BY retry.retried_at, retry.id`,
        [emailOutboxIds],
      );

      await manager.query(
        `INSERT INTO public.candidate_data_lifecycle_audit
          (candidate_id, action, actor_user_id, application_count, details)
         VALUES ($1, 'exported', $2, $3, $4::jsonb)`,
        [
          candidateId,
          actorUserId,
          applicationIds.length,
          JSON.stringify({ resumeCount: resumes.length }),
        ],
      );

      return {
        candidate,
        profileSnapshots: profileSnapshots.map(
          row => row.record as Record<string, unknown>,
        ),
        resumes,
        applications: applications.map(
          row => row.record as Record<string, unknown>,
        ),
        alerts: alerts.map(row => row.record as Record<string, unknown>),
        savedJobs: savedJobs.map(row => row.record as Record<string, unknown>),
        chats: chats.map(row => row.record as Record<string, unknown>),
        messages: messages.map(row => row.record as Record<string, unknown>),
        notifications: notifications.map(
          row => row.record as Record<string, unknown>,
        ),
        savedCandidates: savedCandidates.map(
          row => row.record as Record<string, unknown>,
        ),
        candidateTags: candidateTags.map(
          row => row.record as Record<string, unknown>,
        ),
        emailOutbox: sourceEmailOutbox.map(
          row => row.record as Record<string, unknown>,
        ),
        emailOutboxAdminRetries: emailOutboxAdminRetries.map(
          row => row.record as Record<string, unknown>,
        ),
        activity: activity.map(row => row.record as Record<string, unknown>),
        aiInteractions: aiInteractions.map(
          row => row.record as Record<string, unknown>,
        ),
        capsuleProgress: capsuleProgress.map(
          row => row.record as Record<string, unknown>,
        ),
        capsuleModuleProgress: capsuleModuleProgress.map(
          row => row.record as Record<string, unknown>,
        ),
        certificates: certificates.map(
          row => row.record as Record<string, unknown>,
        ),
        calendarConnections: calendarConnections.map(
          row => row.record as Record<string, unknown>,
        ),
        calendarOauthStates: calendarOauthStates.map(
          row => row.record as Record<string, unknown>,
        ),
        notificationIntents: notificationIntents.map(
          row => row.record as Record<string, unknown>,
        ),
        ...children,
      };
    });
  }

  async processExpiredCandidates(limit = 50): Promise<{
    processed: number;
    applicationsDeleted: number;
    filesQueued: number;
  }> {
    const batchSize = Math.max(1, Math.min(Math.trunc(limit), 200));
    return this.dataSource.transaction(async manager => {
      const candidates = await manager.query<CandidateRow[]>(
        ELIGIBLE_CANDIDATES,
        [batchSize],
      );
      let applicationsDeleted = 0;
      let filesQueued = 0;
      let processed = 0;

      for (const candidate of candidates) {
        const applicationIds = await this.applicationIds(manager, candidate.id);
        if (applicationIds.length === 0) continue;
        const eligible = await manager.query<Array<{ eligible: boolean }>>(
          `SELECT COALESCE(bool_and(
                    application.status::text IN ('contratado', 'rechazado', 'desistido')
                  ), false)
                  AND max(COALESCE(
                    (SELECT history.changed_at
                       FROM public.application_status_history history
                      WHERE history.application_id = application.id
                        AND history.new_status = application.status::text
                      ORDER BY history.changed_at DESC, history.id DESC
                      LIMIT 1),
                    application."updatedAt"
                  )) <= now() - interval '24 months' AS eligible
             FROM public.application application
            WHERE application."candidateId" = $1`,
          [candidate.id],
        );
        if (!eligible[0]?.eligible) continue;
        const candidateFilesQueued = await this.queueCandidateFiles(
          manager,
          candidate.id,
        );
        filesQueued += candidateFilesQueued;
        const eventIds = await this.deleteCandidateEvents(
          manager,
          candidate.id,
          applicationIds,
        );
        const offerRows = await manager.query<Array<{ id: string }>>(
          `SELECT id FROM public.offer_letter WHERE application_id = ANY($1::uuid[])`,
          [applicationIds],
        );
        const offerIds = offerRows.map(offer => offer.id);
        const offerResponseKeys = offerIds.map(id => `offer-response:${id}`);
        const linkedOutboxIds = await manager.query<Array<{ id: string }>>(
          `SELECT outbox.id FROM public.email_outbox outbox
            WHERE outbox.recipient_user_id = $1
               OR lower(outbox.recipient_email) = lower($2)
               OR outbox.source_id = ANY($3::uuid[])
               OR outbox.idempotency_key = ANY($4::text[])`,
          [
            candidate.id,
            candidate.email,
            [...applicationIds, ...offerIds, ...eventIds],
            offerResponseKeys,
          ],
        );
        const emailOutboxIds = linkedOutboxIds.map(row => row.id);
        await manager.query(
          `DELETE FROM public.email_outbox_admin_retry
            WHERE email_outbox_id = ANY($1::uuid[])`,
          [emailOutboxIds],
        );
        await manager.query(
          `DELETE FROM public.email_outbox WHERE id = ANY($1::uuid[])`,
          [emailOutboxIds],
        );
        await manager.query(
          `DELETE FROM public.activity_log WHERE user_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.ai_interaction_logs WHERE user_id = $1::text`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.capsule_progress WHERE user_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.capsule_module_progress WHERE user_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.certificates WHERE user_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.google_calendar_connection
            WHERE owner_type = 'user' AND owner_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.google_calendar_oauth_state
            WHERE created_by_user_id = $1 OR (owner_type = 'user' AND owner_id = $1)`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.application_status_notification_admin_retry retry
            WHERE retry.intent_id IN (
              SELECT intent.id FROM public.application_status_notification_intent intent
              WHERE intent.recipient_id = $1 OR intent.application_id = ANY($2::uuid[])
            )`,
          [candidate.id, applicationIds],
        );
        await manager.query(
          `DELETE FROM public.application_created_notification_admin_retry retry
            USING public.application_created_notification_intent intent
            WHERE retry.intent_id = intent.id
              AND intent.application_id = ANY($1::uuid[])`,
          [applicationIds],
        );
        await manager.query(
          `DELETE FROM public.application_created_notification_intent
            WHERE application_id = ANY($1::uuid[])`,
          [applicationIds],
        );
        await manager.query(
          `DELETE FROM public.application_status_notification_intent
            WHERE recipient_id = $1 OR application_id = ANY($2::uuid[])`,
          [candidate.id, applicationIds],
        );
        await manager.query(
          `DELETE FROM public.message_notification_admin_retry retry
            WHERE retry.intent_id IN (
              SELECT intent.id FROM public.message_notification_intent intent
              WHERE intent.recipient_id = $1 OR intent.chat_id IN (
                SELECT chat.id FROM public.chat chat WHERE chat."professionalId" = $1
              )
            )`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.message_notification_intent
            WHERE recipient_id = $1 OR chat_id IN (
              SELECT id FROM public.chat WHERE "professionalId" = $1
            )`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.system_notification_broadcast_admin_retry retry
            USING public.system_notification_broadcast_intent intent
            WHERE retry.intent_id = intent.id AND intent.recipient_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.system_notification_broadcast_intent WHERE recipient_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.verification
            WHERE value = $1 OR identifier = ANY($2::text[])`,
          [
            candidate.id,
            [
              candidate.email,
              `email-verification-otp-${candidate.email}`,
              `sign-in-otp-${candidate.email}`,
              `forget-password-otp-${candidate.email}`,
            ],
          ],
        );
        await manager.query(
          `DELETE FROM public.chat WHERE "professionalId" = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.saved_job WHERE "userId" = $1`,
          [candidate.id],
        );
        await manager.query(`DELETE FROM public.job_alert WHERE user_id = $1`, [
          candidate.id,
        ]);
        await manager.query(
          `DELETE FROM public.saved_candidate WHERE candidate_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.candidate_tag_assignment WHERE candidate_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.notification WHERE user_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.notification_deduplication WHERE user_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.saved_search_alert_bucket_item item
            USING public.candidate_search_match match
            WHERE item.match_id = match.id AND match.candidate_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.candidate_profile_change_admin_retry retry
            USING public.candidate_profile_change change
            WHERE retry.profile_change_id = change.id AND change.candidate_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.candidate_search_match WHERE candidate_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.candidate_profile_change WHERE candidate_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.saved_search_alert_admin_retry retry
            USING public.saved_search_alert_bucket bucket
            WHERE retry.bucket_id = bucket.id AND bucket.recipient_id = $1`,
          [candidate.id],
        );
        await manager.query(
          `DELETE FROM public.saved_search_alert_bucket WHERE recipient_id = $1`,
          [candidate.id],
        );
        await manager.query(`DELETE FROM public."session" WHERE user_id = $1`, [
          candidate.id,
        ]);
        await manager.query(`DELETE FROM public.account WHERE user_id = $1`, [
          candidate.id,
        ]);
        await manager.query(
          `DELETE FROM public.application WHERE "candidateId" = $1`,
          [candidate.id],
        );
        await manager.query(`DELETE FROM public.resume WHERE "userId" = $1`, [
          candidate.id,
        ]);
        await manager.query(
          `UPDATE public."user"
              SET email = 'deleted+' || id::text || '@anonymized.invalid',
                  name = 'Candidato eliminado',
                  "isEmailVerified" = false,
                  "isActive" = false,
                  "verificationToken" = NULL,
                  avatar = NULL,
                  profession = 'Eliminado',
                  birthday = NULL,
                  phone = NULL,
                  location = NULL,
                  role = NULL,
                  "profileViews" = 0,
                  notification_preferences = NULL,
                  "experienceLevel" = NULL,
                  availability = NULL,
                  "updatedAt" = now()
            WHERE id = $1`,
          [candidate.id],
        );
        await manager.query(
          `INSERT INTO public.candidate_data_lifecycle_audit
            (candidate_id, action, application_count, details)
           VALUES ($1, 'purged', $2, $3::jsonb), ($1, 'anonymized', $2, $4::jsonb)`,
          [
            candidate.id,
            applicationIds.length,
            JSON.stringify({ filesQueued: candidateFilesQueued }),
            JSON.stringify({ profileRetainedForForeignKeys: true }),
          ],
        );
        applicationsDeleted += applicationIds.length;
        processed += 1;
      }

      return {
        processed,
        applicationsDeleted,
        filesQueued,
      };
    });
  }

  private async applicationIds(
    manager: EntityManager,
    candidateId: string,
  ): Promise<string[]> {
    const rows = await manager.query<Array<{ id: string }>>(
      `SELECT id FROM public.application WHERE "candidateId" = $1 FOR UPDATE`,
      [candidateId],
    );
    return rows.map(row => row.id);
  }

  private async queueCandidateFiles(
    manager: EntityManager,
    candidateId: string,
  ): Promise<number> {
    const rows = await manager.query<Array<{ id: string }>>(
      `INSERT INTO public.resume_cv_cleanup (storage_bucket, object_path)
       SELECT paths.storage_bucket, paths.object_path
         FROM (
           SELECT $2::text AS storage_bucket, r."cvFile"::jsonb ->> 'path' AS object_path
             FROM public.resume r
            WHERE r."userId" = $1
           UNION
           SELECT $2::text AS storage_bucket, reservation.object_path
             FROM public.resume_cv_upload_reservation reservation
             JOIN public.resume r ON r.id = reservation.resume_id
            WHERE r."userId" = $1
           UNION
           SELECT extracted.storage_bucket, extracted.object_path
             FROM public.application application
             CROSS JOIN LATERAL (
               SELECT (regexp_match(
                 split_part(application.resume_url, '?', 1),
                 '/storage/v1/object/(public|sign|authenticated)/([^/]+)/(.+)$'
               ))[2] AS storage_bucket,
                      regexp_replace((regexp_match(
                        split_part(application.resume_url, '?', 1),
                        '/storage/v1/object/(public|sign|authenticated)/([^/]+)/(.+)$'
                      ))[3], '%2[fF]', '/', 'g') AS object_path
             ) extracted
            WHERE application."candidateId" = $1
           UNION
           SELECT extracted.storage_bucket, extracted.object_path
             FROM public."user" candidate
             CROSS JOIN LATERAL (
               SELECT (regexp_match(
                 split_part(candidate.avatar, '?', 1),
                 '/storage/v1/object/(public|sign|authenticated)/([^/]+)/(.+)$'
               ))[2] AS storage_bucket,
                      regexp_replace((regexp_match(
                        split_part(candidate.avatar, '?', 1),
                        '/storage/v1/object/(public|sign|authenticated)/([^/]+)/(.+)$'
                      ))[3], '%2[fF]', '/', 'g') AS object_path
             ) extracted
            WHERE candidate.id = $1
           UNION
           SELECT parsed.storage_bucket, parsed.object_path
             FROM public.message message
             JOIN public.chat chat ON chat.id = message."chatId"
             CROSS JOIN LATERAL (
               SELECT (regexp_match(
                 split_part(message.content_type ->> 'url', '?', 1),
                 '/storage/v1/object/(public|sign|authenticated)/([^/]+)/(.+)$'
               ))[2] AS storage_bucket,
                      regexp_replace((regexp_match(
                        split_part(message.content_type ->> 'url', '?', 1),
                        '/storage/v1/object/(public|sign|authenticated)/([^/]+)/(.+)$'
                      ))[3], '%2[fF]', '/', 'g') AS object_path
             ) parsed
            WHERE chat."professionalId" = $1
              AND message.type::text IN ('file', 'audio', 'image')
              AND message.content_type ->> 'url' IS NOT NULL
           UNION
           SELECT $3::text AS storage_bucket, offer.pdf_path AS object_path
             FROM public.offer_letter offer
            WHERE offer.candidate_id = $1
              AND offer.pdf_path LIKE 'offer-letters/%'
         ) paths
        WHERE paths.object_path IS NOT NULL
          AND paths.storage_bucket IN ($2, $3)
       ON CONFLICT (storage_bucket, object_path) DO NOTHING
       RETURNING id`,
      [candidateId, CV_STORAGE_BUCKET, APP_STORAGE_BUCKET],
    );
    await manager.query(
      `UPDATE public.resume_cv_upload_reservation reservation
          SET status = 'expired'
         FROM public.resume r
        WHERE reservation.resume_id = r.id
          AND r."userId" = $1
          AND reservation.status = 'active'`,
      [candidateId],
    );
    return rows.length;
  }

  private async deleteCandidateEvents(
    manager: EntityManager,
    candidateId: string,
    applicationIds: string[],
  ): Promise<string[]> {
    const events = await manager.query<Array<{ id: string }>>(
      `SELECT id FROM public.event
        WHERE "candidateId" = $1 OR "applicationId" = ANY($2::uuid[])
           OR "organizerId" = $1
           OR EXISTS (
             SELECT 1 FROM public.event_participant participant
              WHERE participant.event_id = event.id AND participant.user_id = $1
           )
           OR EXISTS (
             SELECT 1 FROM public.event_interviewer interviewer
              WHERE interviewer.event_id = event.id AND interviewer.user_id = $1
           )
        FOR UPDATE`,
      [candidateId, applicationIds],
    );
    const eventIds = events.map(event => event.id);
    const participants = await manager.query<Array<{ id: string }>>(
      `SELECT id FROM public.event_participant WHERE user_id = $1 FOR UPDATE`,
      [candidateId],
    );
    const participantIds = participants.map(participant => participant.id);
    await manager.query(
      `SELECT set_config('app.purge_candidate_data', 'on', true)`,
    );
    await manager.query(
      `DELETE FROM public.event_change_notification_admin_retry retry
        WHERE retry.intent_id IN (
          SELECT intent.id FROM public.event_change_notification_intent intent
          WHERE intent.event_id = ANY($1::uuid[]) OR intent.change_history_id IN (
            SELECT history.id FROM public.event_change_history history
            WHERE history.actor_user_id = $2 OR history.event_id = ANY($1::uuid[])
          )
        )`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_change_notification_intent intent
        WHERE intent.event_id = ANY($1::uuid[])
           OR intent.change_history_id IN (
             SELECT history.id FROM public.event_change_history history
              WHERE history.actor_user_id = $2 OR history.event_id = ANY($1::uuid[])
           )`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_lifecycle_notification_admin_retry retry
        WHERE retry.intent_id IN (
          SELECT intent.id FROM public.event_lifecycle_notification_intent intent
          WHERE intent.event_id = ANY($1::uuid[]) OR intent.participant_id = ANY($2::uuid[])
             OR intent.actor_user_id = $3
        )`,
      [eventIds, participantIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_lifecycle_notification_intent
        WHERE event_id = ANY($1::uuid[]) OR participant_id = ANY($2::uuid[]) OR actor_user_id = $3`,
      [eventIds, participantIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.interview_reminder_notification_admin_retry retry
        USING public.interview_reminder_notification_intent intent
        WHERE retry.intent_id = intent.id
          AND (intent.event_id = ANY($1::uuid[]) OR intent.participant_id = ANY($2::uuid[]))`,
      [eventIds, participantIds],
    );
    await manager.query(
      `DELETE FROM public.interview_reminder_notification_intent
        WHERE event_id = ANY($1::uuid[]) OR participant_id = ANY($2::uuid[])`,
      [eventIds, participantIds],
    );
    await manager.query(
      `DELETE FROM public.event_change_history
        WHERE event_id = ANY($1::uuid[]) OR actor_user_id = $2`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_note WHERE "eventId" = ANY($1::uuid[]) OR "authorId" = $2`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_interview_audit
        WHERE event_id = ANY($1::uuid[]) OR actor_id = $2 OR subject_user_id = $2`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_interview_evaluation WHERE evaluator_id = $2 OR event_id = ANY($1::uuid[])`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_interview_outcome WHERE decision_maker_id = $2 OR event_id = ANY($1::uuid[])`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_interviewer WHERE user_id = $2 OR event_id = ANY($1::uuid[])`,
      [eventIds, candidateId],
    );
    await manager.query(
      `DELETE FROM public.event_participant WHERE user_id = $2`,
      [eventIds, candidateId],
    );
    await manager.query(`DELETE FROM public.event WHERE id = ANY($1::uuid[])`, [
      eventIds,
    ]);
    return eventIds;
  }

  private async applicationExportRows(
    manager: EntityManager,
    applicationIds: string[],
    candidateId: string,
  ): Promise<
    Pick<
      CandidateExport,
      | 'answers'
      | 'evaluations'
      | 'notes'
      | 'statusHistory'
      | 'events'
      | 'eventParticipants'
      | 'participantStatusHistory'
      | 'interviewEvaluations'
      | 'interviewOutcomes'
      | 'interviewAudit'
      | 'eventNotes'
      | 'eventChangeHistory'
      | 'eventInterviewers'
      | 'aiScores'
      | 'offers'
    >
  > {
    const [
      answers,
      evaluations,
      notes,
      statusHistory,
      events,
      eventParticipants,
      participantStatusHistory,
      interviewEvaluations,
      interviewOutcomes,
      interviewAudit,
      eventNotes,
      eventChangeHistory,
      eventInterviewers,
      aiScores,
      offers,
    ] = await Promise.all([
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.application_answer row
          WHERE row.application_id = ANY($1::uuid[]) ORDER BY row.id`,
        [applicationIds],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.application_evaluation row
          WHERE row.application_id = ANY($1::uuid[]) ORDER BY row.id`,
        [applicationIds],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.application_note row
          WHERE row.application_id = ANY($1::uuid[]) ORDER BY row.id`,
        [applicationIds],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.application_status_history row
          WHERE row.application_id = ANY($1::uuid[]) ORDER BY row.changed_at, row.id`,
        [applicationIds],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.event row
          WHERE row."applicationId" = ANY($1::uuid[]) OR row."candidateId" = $2
             OR row."organizerId" = $2
             OR EXISTS (SELECT 1 FROM public.event_participant participant
                         WHERE participant.event_id = row.id AND participant.user_id = $2)
          ORDER BY row."startAt", row.id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(participant) AS record
           FROM public.event_participant participant
           JOIN public.event event ON event.id = participant.event_id
          WHERE event."applicationId" = ANY($1::uuid[]) OR event."candidateId" = $2
             OR event."organizerId" = $2
             OR participant.user_id = $2
          ORDER BY participant.created_at, participant.id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(history) AS record
           FROM public.event_participant_status_history history
           JOIN public.event event ON event.id = history.event_id
          WHERE event."applicationId" = ANY($1::uuid[]) OR event."candidateId" = $2
             OR event."organizerId" = $2
             OR history.user_id = $2
          ORDER BY history.changed_at, history.id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.event_interview_evaluation row
           JOIN public.event event ON event.id = row.event_id
          WHERE event."applicationId" = ANY($1::uuid[]) OR event."candidateId" = $2
             OR event."organizerId" = $2
             OR row.evaluator_id = $2
          ORDER BY row.created_at, row.id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.event_interview_outcome row
           JOIN public.event event ON event.id = row.event_id
          WHERE event."applicationId" = ANY($1::uuid[]) OR event."candidateId" = $2
             OR event."organizerId" = $2
             OR row.decision_maker_id = $2
          ORDER BY row.updated_at, row.event_id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.event_interview_audit row
           JOIN public.event event ON event.id = row.event_id
          WHERE event."applicationId" = ANY($1::uuid[]) OR event."candidateId" = $2
             OR row.actor_id = $2 OR row.subject_user_id = $2
          ORDER BY row.created_at, row.id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.event_note row
          WHERE row."authorId" = $2 OR row."eventId" IN (
            SELECT event.id FROM public.event
             WHERE event."candidateId" = $2 OR event."organizerId" = $2
                OR event."applicationId" = ANY($1::uuid[])
          ) ORDER BY row."createdAt", row.id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.event_change_history row
          WHERE row.actor_user_id = $2 OR row.event_id IN (
            SELECT event.id FROM public.event
             WHERE event."candidateId" = $2 OR event."organizerId" = $2
                OR event."applicationId" = ANY($1::uuid[])
          ) ORDER BY row.created_at, row.id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(row) AS record FROM public.event_interviewer row
          WHERE row.user_id = $2 OR row.event_id IN (
            SELECT event.id FROM public.event
             WHERE event."candidateId" = $2 OR event."organizerId" = $2
                OR event."applicationId" = ANY($1::uuid[])
          ) ORDER BY row.created_at, row.event_id, row.user_id`,
        [applicationIds, candidateId],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(score) AS record FROM public.application_ai_score score
          WHERE score.application_id = ANY($1::uuid[]) ORDER BY score.created_at, score.id`,
        [applicationIds],
      ),
      manager.query<Array<Record<string, unknown>>>(
        `SELECT to_jsonb(offer) AS record FROM public.offer_letter offer
          WHERE offer.application_id = ANY($1::uuid[]) ORDER BY offer.created_at, offer.id`,
        [applicationIds],
      ),
    ]);
    return {
      answers: answers.map(row => row.record as Record<string, unknown>),
      evaluations: evaluations.map(
        row => row.record as Record<string, unknown>,
      ),
      notes: notes.map(row => row.record as Record<string, unknown>),
      statusHistory: statusHistory.map(
        row => row.record as Record<string, unknown>,
      ),
      events: events.map(row => row.record as Record<string, unknown>),
      eventParticipants: eventParticipants.map(
        row => row.record as Record<string, unknown>,
      ),
      participantStatusHistory: participantStatusHistory.map(
        row => row.record as Record<string, unknown>,
      ),
      interviewEvaluations: interviewEvaluations.map(
        row => row.record as Record<string, unknown>,
      ),
      interviewOutcomes: interviewOutcomes.map(
        row => row.record as Record<string, unknown>,
      ),
      interviewAudit: interviewAudit.map(
        row => row.record as Record<string, unknown>,
      ),
      eventNotes: eventNotes.map(row => row.record as Record<string, unknown>),
      eventChangeHistory: eventChangeHistory.map(
        row => row.record as Record<string, unknown>,
      ),
      eventInterviewers: eventInterviewers.map(
        row => row.record as Record<string, unknown>,
      ),
      aiScores: aiScores.map(row => row.record as Record<string, unknown>),
      offers: offers.map(row => row.record as Record<string, unknown>),
    };
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, EntityManager } from 'typeorm';
import { ApplicationStatus } from '../../core/domain/enums';
import { isTerminalApplicationStatus } from '../../core/domain/application-status-policy';
import {
  IOfferResponseEmailIntentRepository,
  OfferResponseCommit,
  OfferResponseEmailIntent,
} from '../../core/repositories/offer-response-email-intent.repository';

type OfferRow = {
  id: string;
  application_id: string;
  organization_id: string;
  status: 'accepted' | 'rejected';
  letter_data: Record<string, unknown>;
  chat_id: string | null;
  message_id: string | null;
  title: string | null;
};

type RecipientRow = { id: string; email: string };
type ApplicationRow = {
  id: string;
  job_id: string;
  status: ApplicationStatus;
  pipeline_stage_id: string;
};
type PipelineStageRow = {
  id: string;
  name: string;
  status_projection: ApplicationStatus;
  is_archived: boolean;
};
type PreviousStageRow = { id: string; name: string };

@Injectable()
export class OfferResponseEmailIntentRepositoryImpl implements IOfferResponseEmailIntentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async commitResponse(input: {
    offerId: string;
    candidateId: string;
    response: 'accepted' | 'rejected';
  }): Promise<OfferResponseCommit> {
    return this.dataSource.transaction(async manager => {
      const rows = await manager.query<OfferRow[]>(
        `UPDATE offer_letter
         SET status = $3, responded_at = now(), "updatedAt" = now()
         WHERE id = $1 AND candidate_id = $2 AND status = 'sent'
           AND (expires_at IS NULL OR expires_at > now())
         RETURNING id, application_id, organization_id, status, letter_data,
           chat_id, message_id, title`,
        [input.offerId, input.candidateId, input.response],
      );
      const offer = rows[0];
      if (!offer) return { kind: 'already_responded' };

      await this.updateApplicationStage(manager, {
        applicationId: offer.application_id,
        status:
          input.response === 'accepted'
            ? ApplicationStatus.CONTRATADO
            : ApplicationStatus.RECHAZADO,
        changedById: input.candidateId,
      });

      if (offer.message_id) {
        await manager.query(
          `UPDATE message SET content_type = $2::jsonb WHERE id = $1`,
          [
            offer.message_id,
            JSON.stringify({
              offerLetterId: offer.id,
              title: offer.title ?? 'Carta de oferta',
              status: input.response,
            }),
          ],
        );
      }

      const recipients = await manager.query<RecipientRow[]>(
        `SELECT preferred.id, preferred.email
         FROM (
           SELECT u.id, u.email, u."createdAt",
                  CASE WHEN u.id = chat."recruiterId" THEN 0 ELSE 1 END AS preference
           FROM "user" u
           LEFT JOIN organization_member membership
             ON membership.user_id = u.id
            AND membership.organization_id = $1
           LEFT JOIN chat ON chat.id = $2
           WHERE u.type = 'organization' AND u."isActive" = true
             AND (u."organizationId" = $1
                  OR membership.role IN ('admin', 'recruiter'))
         ) preferred
         ORDER BY preferred.preference ASC, preferred."createdAt" ASC
         LIMIT 1`,
        [offer.organization_id, offer.chat_id],
      );
      const recipient = recipients[0] ?? null;
      const candidateName = this.stringValue(
        offer.letter_data['candidateName'],
        'The candidate',
      );
      const jobTitle = this.stringValue(
        offer.letter_data['jobTitle'],
        'the position',
      );

      await manager.query(
        `INSERT INTO offer_response_email_intent
          (offer_id, event_key, organization_id, response, recipient_id,
           recipient_email, candidate_name, job_title, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
         ON CONFLICT (offer_id) DO NOTHING`,
        [
          offer.id,
          `offer-response:${offer.id}`,
          offer.organization_id,
          offer.status,
          recipient?.id ?? null,
          recipient?.email ?? null,
          candidateName,
          jobTitle,
        ],
      );
      return { kind: 'committed', recipientId: recipient?.id ?? null };
    });
  }

  private async updateApplicationStage(
    manager: EntityManager,
    input: {
      applicationId: string;
      status: ApplicationStatus;
      changedById: string;
    },
  ): Promise<void> {
    const applications = await manager.query<ApplicationRow[]>(
      `SELECT id, "jobId" AS job_id, status, pipeline_stage_id
       FROM application
       WHERE id = $1
       FOR UPDATE`,
      [input.applicationId],
    );
    const application = applications[0];
    if (!application) {
      throw new NotFoundException(
        `Application with id ${input.applicationId} not found`,
      );
    }
    if (isTerminalApplicationStatus(application.status)) {
      return Promise.reject(
        new BadRequestException(
          'The application is closed and cannot change stage',
        ),
      );
    }

    const stages = await manager.query<PipelineStageRow[]>(
      `SELECT id, name, status_projection, is_archived
       FROM pipeline_stage
       WHERE job_id = $1 AND system_key = $2
       FOR UPDATE`,
      [application.job_id, input.status],
    );
    const stage = stages[0];
    if (!stage || stage.is_archived) {
      throw new BadRequestException(
        `Active built-in stage not found for status ${input.status}`,
      );
    }

    const previousStages = application.pipeline_stage_id
      ? await manager.query<PreviousStageRow[]>(
          `SELECT id, name
           FROM pipeline_stage
           WHERE id = $1 AND job_id = $2
           FOR UPDATE`,
          [application.pipeline_stage_id, application.job_id],
        )
      : [];
    const previousStage = previousStages[0] ?? null;
    if (stage.id === application.pipeline_stage_id) return;

    await manager.query(
      `UPDATE application
       SET status = $2, pipeline_stage_id = $3,
           "stageChangedAt" = now(), "updatedAt" = now()
       WHERE id = $1`,
      [application.id, stage.status_projection, stage.id],
    );
    await manager.query(
      `INSERT INTO application_status_history
        (application_id, previous_status, new_status, changed_at, changed_by_id,
         rejection_note, previous_stage_id, new_stage_id,
         previous_stage_name, new_stage_name)
       VALUES ($1, $2, $3, now(), $4, NULL, $5, $6, $7, $8)`,
      [
        application.id,
        application.status,
        stage.status_projection,
        input.changedById,
        previousStage?.id ?? application.pipeline_stage_id,
        stage.id,
        previousStage?.name ?? null,
        stage.name,
      ],
    );
  }

  async claimDue(limit: number): Promise<OfferResponseEmailIntent[]> {
    await this.dataSource.query(
      `UPDATE offer_response_email_intent
       SET status = 'dead', updated_at = now()
       WHERE attempt_count >= 8 AND status IN ('pending', 'retry')`,
    );
    return this.dataSource.query<OfferResponseEmailIntent[]>(
      `WITH ready AS (
         SELECT id FROM offer_response_email_intent
         WHERE recipient_id IS NOT NULL AND recipient_email IS NOT NULL
           AND attempt_count < 8
           AND ((status IN ('pending', 'retry') AND available_at <= now())
             OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))
         ORDER BY available_at ASC, created_at ASC
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE offer_response_email_intent intent
       SET status = 'processing', attempt_count = intent.attempt_count + 1,
           locked_at = now(), updated_at = now()
       FROM ready
       WHERE intent.id = ready.id
       RETURNING intent.id, intent.event_key AS "eventKey",
         intent.offer_id AS "offerId", intent.organization_id AS "organizationId",
         intent.response, intent.recipient_id AS "recipientId",
         intent.recipient_email AS "recipientEmail",
         intent.candidate_name AS "candidateName", intent.job_title AS "jobTitle",
         intent.attempt_count AS "attemptCount"`,
      [limit],
    );
  }

  async markAccepted(id: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE offer_response_email_intent
       SET status = 'accepted', locked_at = NULL, last_error_code = NULL,
           updated_at = now()
       WHERE id = $1`,
      [id],
    );
  }

  async markRetry(id: string, errorCode: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE offer_response_email_intent
       SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
           available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
           locked_at = NULL, last_error_code = $2, updated_at = now()
       WHERE id = $1`,
      [id, errorCode],
    );
  }

  async reconcilePendingRecipients(): Promise<void> {
    await this.dataSource.transaction(async manager => {
      await manager.query(
        `UPDATE offer_response_email_intent intent
         SET recipient_id = recipient.id, recipient_email = recipient.email,
             updated_at = now()
         FROM offer_letter offer
         CROSS JOIN LATERAL (
           SELECT u.id, u.email
           FROM "user" u
           LEFT JOIN organization_member membership
             ON membership.user_id = u.id
            AND membership.organization_id = offer.organization_id
           LEFT JOIN chat ON chat.id = offer.chat_id
           WHERE u.type = 'organization' AND u."isActive" = true
             AND (u."organizationId" = offer.organization_id
                  OR membership.role IN ('admin', 'recruiter'))
           ORDER BY CASE WHEN u.id = chat."recruiterId" THEN 0 ELSE 1 END,
                    u."createdAt" ASC
           LIMIT 1
         ) recipient
         WHERE intent.offer_id = offer.id
           AND intent.recipient_id IS NULL
           AND intent.status IN ('pending', 'retry')`,
      );
    });
  }

  private stringValue(value: unknown, fallback: string): string {
    return typeof value === 'string' && value.length > 0 ? value : fallback;
  }
}

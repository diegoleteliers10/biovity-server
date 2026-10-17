import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  OrganizationVerificationEmailIntent,
  OrganizationVerificationEmailIntentRepository,
} from '../../core/repositories/organization-verification-email-intent.repository';

@Injectable()
export class OrganizationVerificationEmailIntentRepositoryImpl implements OrganizationVerificationEmailIntentRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async claimDue(
    limit: number,
  ): Promise<OrganizationVerificationEmailIntent[]> {
    await this.dataSource.query(
      `UPDATE organization_verification_email_intent
       SET status = 'dead', locked_at = NULL, updated_at = now()
       WHERE attempt_count >= 8
         AND (status IN ('pending', 'retry')
           OR (status = 'processing' AND locked_at < now() - interval '5 minutes'))`,
    );
    return this.dataSource.query<OrganizationVerificationEmailIntent[]>(
      `WITH ready AS (
         SELECT intent.id
         FROM organization_verification_email_intent intent
         WHERE intent.attempt_count < 8
           AND ((intent.status IN ('pending', 'retry') AND intent.available_at <= now())
             OR (intent.status = 'processing' AND intent.locked_at < now() - interval '5 minutes'))
         ORDER BY intent.available_at, intent.created_at
         FOR UPDATE SKIP LOCKED
         LIMIT $1
       )
       UPDATE organization_verification_email_intent intent
       SET status = 'processing', attempt_count = intent.attempt_count + 1,
           locked_at = now(), updated_at = now()
       FROM ready, organization_verification_request request
       WHERE intent.id = ready.id AND request.id = intent.request_id
       RETURNING intent.id, intent.event_key AS "eventKey",
         intent.request_id AS "requestId", request.legal_name AS "legalName",
         intent.recipient_email AS "recipientEmail",
         intent.attempt_count AS "attemptCount"`,
      [limit],
    );
  }

  async markAccepted(id: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE organization_verification_email_intent
       SET status = 'accepted', locked_at = NULL, last_error_code = NULL, updated_at = now()
       WHERE id = $1 AND status = 'processing'`,
      [id],
    );
  }

  async markRetry(id: string, errorCode: string): Promise<void> {
    await this.dataSource.query(
      `UPDATE organization_verification_email_intent
       SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END,
           available_at = now() + LEAST(3600, power(2, attempt_count) * 30) * interval '1 second',
           locked_at = NULL, last_error_code = $2, updated_at = now()
       WHERE id = $1 AND status = 'processing'`,
      [id, errorCode],
    );
  }
}

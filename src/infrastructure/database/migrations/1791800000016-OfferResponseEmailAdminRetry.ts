import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferResponseEmailAdminRetry1791800000016 implements MigrationInterface {
  name = 'OfferResponseEmailAdminRetry1791800000016';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE offer_response_email_admin_retry (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        intent_id uuid NOT NULL,
        actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL CHECK (previous_attempt_count >= 8),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_offer_response_email_admin_retry_intent_created
      ON offer_response_email_admin_retry (intent_id, created_at DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX idx_offer_response_email_admin_retry_intent_created`,
    );
    await queryRunner.query(`DROP TABLE offer_response_email_admin_retry`);
  }
}

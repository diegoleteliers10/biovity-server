import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationVerificationEmailIntent1791800000019 implements MigrationInterface {
  name = 'OrganizationVerificationEmailIntent1791800000019';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organization_verification_email_intent (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_key text NOT NULL UNIQUE,
        request_id uuid NOT NULL REFERENCES organization_verification_request(id) ON DELETE RESTRICT,
        recipient_email text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'accepted', 'retry', 'dead')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz,
        last_error_code varchar(80),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (request_id, recipient_email)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_org_verification_email_intent_due
      ON organization_verification_email_intent (available_at, created_at)
      WHERE status IN ('pending', 'retry', 'processing')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX idx_org_verification_email_intent_due');
    await queryRunner.query(
      'DROP TABLE organization_verification_email_intent',
    );
  }
}

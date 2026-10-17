import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferResponseEmailIntent1791800000008 implements MigrationInterface {
  name = 'OfferResponseEmailIntent1791800000008';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE offer_response_email_intent (
        id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        offer_id uuid NOT NULL UNIQUE REFERENCES offer_letter(id) ON DELETE CASCADE,
        event_key text NOT NULL UNIQUE,
        organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE RESTRICT,
        response varchar(20) NOT NULL CHECK (response IN ('accepted', 'rejected')),
        recipient_id uuid NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        recipient_email text NULL,
        candidate_name text NOT NULL,
        job_title text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'retry', 'accepted', 'dead')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz NULL,
        last_error_code varchar(40) NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK ((recipient_id IS NULL) = (recipient_email IS NULL))
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_offer_response_email_due ON offer_response_email_intent (status, available_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX idx_offer_response_email_due`);
    await queryRunner.query(`DROP TABLE offer_response_email_intent`);
  }
}

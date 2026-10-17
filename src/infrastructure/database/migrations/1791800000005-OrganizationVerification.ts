import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationVerification1791800000005 implements MigrationInterface {
  name = 'OrganizationVerification1791800000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization
      ADD COLUMN verification_status varchar NOT NULL DEFAULT 'unverified',
      ADD CONSTRAINT ck_organization_verification_status
        CHECK (verification_status IN ('unverified', 'pending', 'verified', 'rejected', 'suspended'))
    `);
    await queryRunner.query(`
      CREATE TABLE organization_verification_request (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
        legal_name text NOT NULL,
        country_code varchar(2) NOT NULL,
        registration_number text NOT NULL,
        registry_url text NOT NULL,
        status varchar NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'approved', 'rejected')),
        reviewer_user_id uuid REFERENCES "user"(id) ON DELETE SET NULL,
        reviewed_at timestamptz,
        review_reason text,
        created_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT ck_organization_verification_review
          CHECK ((status = 'pending' AND reviewed_at IS NULL)
            OR (status <> 'pending' AND reviewed_at IS NOT NULL))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_organization_verification_request_status_created
      ON organization_verification_request (status, created_at)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_organization_verification_request_pending
      ON organization_verification_request (organization_id)
      WHERE status = 'pending'
    `);
    await queryRunner.query(`
      CREATE INDEX idx_organization_verification_request_organization
      ON organization_verification_request (organization_id, created_at DESC)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX uq_organization_verification_request_pending',
    );
    await queryRunner.query(
      'DROP INDEX idx_organization_verification_request_organization',
    );
    await queryRunner.query(
      'DROP INDEX idx_organization_verification_request_status_created',
    );
    await queryRunner.query('DROP TABLE organization_verification_request');
    await queryRunner.query(
      'ALTER TABLE organization DROP CONSTRAINT ck_organization_verification_status',
    );
    await queryRunner.query(
      'ALTER TABLE organization DROP COLUMN verification_status',
    );
  }
}

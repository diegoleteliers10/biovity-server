import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationRejectionReasons1791800000015 implements MigrationInterface {
  name = 'ApplicationRejectionReasons1791800000015';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organization_rejection_reason (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES organization(id) ON DELETE CASCADE,
        label varchar(120) NOT NULL,
        sort_order integer NOT NULL DEFAULT 0,
        active boolean NOT NULL DEFAULT true,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_organization_rejection_reason_org
      ON organization_rejection_reason (organization_id, sort_order, created_at)
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX uq_organization_rejection_reason_active_label
      ON organization_rejection_reason (organization_id, lower(label))
      WHERE active = true
    `);
    await queryRunner.query(`
      ALTER TABLE application_status_history
      ADD COLUMN rejection_reason_id uuid
        REFERENCES organization_rejection_reason(id) ON DELETE SET NULL,
      ADD COLUMN rejection_reason_snapshot varchar(120)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE application_status_history
      DROP COLUMN rejection_reason_snapshot,
      DROP COLUMN rejection_reason_id
    `);
    await queryRunner.query('DROP INDEX uq_organization_rejection_reason_active_label');
    await queryRunner.query('DROP INDEX idx_organization_rejection_reason_org');
    await queryRunner.query('DROP TABLE organization_rejection_reason');
  }
}

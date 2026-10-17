import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationRejectionNote1791800000002 implements MigrationInterface {
  name = 'ApplicationRejectionNote1791800000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE application_status_history
      ADD COLUMN IF NOT EXISTS rejection_note text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE application_status_history
      DROP COLUMN IF EXISTS rejection_note
    `);
  }
}

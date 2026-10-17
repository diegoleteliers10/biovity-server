import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationHiringPlan1791800000004 implements MigrationInterface {
  name = 'ApplicationHiringPlan1791800000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE application
        ADD COLUMN assignee_id uuid,
        ADD COLUMN next_action text,
        ADD COLUMN target_date date,
        ADD CONSTRAINT fk_application_assignee
          FOREIGN KEY (assignee_id) REFERENCES "user"(id) ON DELETE SET NULL,
        ADD CONSTRAINT ck_application_next_action_length
          CHECK (next_action IS NULL OR char_length(next_action) <= 500)
    `);
    await queryRunner.query(`
      CREATE INDEX idx_application_target_date_open
      ON application (target_date)
      WHERE target_date IS NOT NULL
        AND status NOT IN ('contratado', 'rechazado', 'desistido')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('LOCK TABLE application IN ACCESS EXCLUSIVE MODE');
    const [plannedApplications] = (await queryRunner.query(
      `SELECT COUNT(*)::int AS count
       FROM application
       WHERE assignee_id IS NOT NULL OR next_action IS NOT NULL OR target_date IS NOT NULL`,
    )) as Array<{ count: number }>;
    if (plannedApplications.count > 0) {
      return Promise.reject(
        new Error(
          'Cannot revert ApplicationHiringPlan while hiring plans exist. Export the application hiring-plan data before manual rollback.',
        ),
      );
    }
    await queryRunner.query('DROP INDEX IF EXISTS idx_application_target_date_open');
    await queryRunner.query(`
      ALTER TABLE application
        DROP CONSTRAINT IF EXISTS ck_application_next_action_length,
        DROP CONSTRAINT IF EXISTS fk_application_assignee,
        DROP COLUMN IF EXISTS target_date,
        DROP COLUMN IF EXISTS next_action,
        DROP COLUMN IF EXISTS assignee_id
    `);
  }
}

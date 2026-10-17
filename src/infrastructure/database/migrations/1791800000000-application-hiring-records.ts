import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationHiringRecords1791800000000 implements MigrationInterface {
  name = 'ApplicationHiringRecords1791800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE evaluation_rating AS ENUM ('positive', 'neutral', 'negative');
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_evaluation (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id uuid NOT NULL REFERENCES application(id) ON DELETE CASCADE,
        evaluator_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        rating evaluation_rating NOT NULL,
        notes text,
        skills_assessment jsonb DEFAULT '{}'::jsonb,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT uq_eval_app_evaluator UNIQUE (application_id, evaluator_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_eval_application
      ON application_evaluation(application_id)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS application_note (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        application_id uuid NOT NULL REFERENCES application(id) ON DELETE CASCADE,
        author_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        content text NOT NULL,
        tags text[] DEFAULT '{}',
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_app_note_application
      ON application_note(application_id, created_at DESC)
    `);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // These tables already exist in installations that ran the frontend SQL migrations.
    // Keep their data when the API migration is reverted.
  }
}

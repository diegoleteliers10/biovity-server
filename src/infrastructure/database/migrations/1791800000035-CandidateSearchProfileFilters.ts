import { MigrationInterface, QueryRunner } from 'typeorm';

export class CandidateSearchProfileFilters1791800000035 implements MigrationInterface {
  name = 'CandidateSearchProfileFilters1791800000035';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public."user"
        ADD COLUMN "experienceLevel" varchar(16),
        ADD COLUMN availability varchar(16),
        ADD CONSTRAINT user_experience_level_check
          CHECK ("experienceLevel" IS NULL OR "experienceLevel" IN ('junior', 'mid', 'senior', 'lead', 'manager')),
        ADD CONSTRAINT user_availability_check
          CHECK (availability IS NULL OR availability IN ('immediate', '2weeks', '1month', 'open'))
    `);
    await queryRunner.query(`
      CREATE INDEX idx_user_candidate_facets
      ON public."user" ("experienceLevel", availability)
      WHERE type = 'professional' AND "isActive" = true
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM public."user"
          WHERE "experienceLevel" IS NOT NULL OR availability IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'export candidate search profile fields before rollback';
        END IF;
      END;
      $migration$
    `);
    await queryRunner.query('DROP INDEX public.idx_user_candidate_facets');
    await queryRunner.query(`
      ALTER TABLE public."user"
        DROP CONSTRAINT user_experience_level_check,
        DROP CONSTRAINT user_availability_check,
        DROP COLUMN "experienceLevel",
        DROP COLUMN availability
    `);
  }
}

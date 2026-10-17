import { MigrationInterface, QueryRunner } from 'typeorm';

export class CandidateProfileChangeSnapshot1791800000036 implements MigrationInterface {
  name = 'CandidateProfileChangeSnapshot1791800000036';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.candidate_profile_change (
        id uuid PRIMARY KEY,
        candidate_id uuid NOT NULL,
        snapshot jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        processed_at timestamptz
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_candidate_profile_change_pending
      ON public.candidate_profile_change (created_at, id)
      WHERE processed_at IS NULL
    `);
    await queryRunner.query(
      'ALTER TABLE public.candidate_profile_change ENABLE ROW LEVEL SECURITY',
    );
    await queryRunner.query(`
      REVOKE ALL ON public.candidate_profile_change
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.candidate_profile_change) THEN
          RAISE EXCEPTION 'export candidate profile change snapshots before rollback';
        END IF;
      END;
      $migration$
    `);
    await queryRunner.query(
      'DROP INDEX public.idx_candidate_profile_change_pending',
    );
    await queryRunner.query('DROP TABLE public.candidate_profile_change');
  }
}

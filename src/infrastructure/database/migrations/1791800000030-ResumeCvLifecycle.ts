import { MigrationInterface, QueryRunner } from 'typeorm';

export class ResumeCvLifecycle1791800000030 implements MigrationInterface {
  name = 'ResumeCvLifecycle1791800000030';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE public.resume ADD COLUMN cv_version integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `CREATE TABLE public.resume_cv_upload_reservation (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         resume_id uuid NOT NULL REFERENCES public.resume(id) ON DELETE CASCADE,
         user_id uuid NOT NULL,
         object_path text NOT NULL UNIQUE,
         expected_version integer NOT NULL,
         status text NOT NULL CHECK (status IN ('active', 'finalized', 'expired')),
         expires_at timestamptz NOT NULL,
         created_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_resume_cv_reservation_expiry
         ON public.resume_cv_upload_reservation (expires_at)
       WHERE status = 'active'`,
    );
    await queryRunner.query(
      `CREATE TABLE public.resume_cv_cleanup (
         id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
         object_path text NOT NULL UNIQUE,
         status text NOT NULL DEFAULT 'pending'
           CHECK (status IN ('pending', 'leased', 'completed', 'dead')),
         attempts integer NOT NULL DEFAULT 0,
         available_at timestamptz NOT NULL DEFAULT now(),
         lease_token uuid,
         lease_expires_at timestamptz,
         last_error text,
         created_at timestamptz NOT NULL DEFAULT now(),
         updated_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    await queryRunner.query(
      `CREATE INDEX idx_resume_cv_cleanup_claim
         ON public.resume_cv_cleanup (available_at, created_at)
       WHERE status IN ('pending', 'leased')`,
    );

    for (const table of ['resume_cv_upload_reservation', 'resume_cv_cleanup']) {
      await queryRunner.query(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      await queryRunner.query(
        `REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated, service_role`,
      );
    }
  }

  down(): Promise<void> {
    return Promise.reject(
      new Error('CV lifecycle migration cannot be rolled back safely'),
    );
  }
}

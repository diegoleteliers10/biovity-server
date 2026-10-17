import { MigrationInterface, QueryRunner } from 'typeorm';

const SAVED_SEARCH_ALERT_TABLES = [
  'candidate_search_match',
  'saved_search_alert_bucket',
  'saved_search_alert_bucket_item',
  'saved_search_alert_admin_retry',
  'candidate_profile_change_admin_retry',
] as const;

export class SavedSearchAlertQueue1791800000037 implements MigrationInterface {
  name = 'SavedSearchAlertQueue1791800000037';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.candidate_profile_change
        ADD COLUMN match_attempt_count integer NOT NULL DEFAULT 0,
        ADD COLUMN match_last_error text,
        ADD COLUMN match_failed_at timestamptz
    `);
    await queryRunner.query(`
      CREATE TABLE public.candidate_search_match (
        id uuid PRIMARY KEY,
        saved_search_id uuid NOT NULL
          REFERENCES public.saved_search(id) ON DELETE CASCADE,
        profile_change_id uuid NOT NULL
          REFERENCES public.candidate_profile_change(id) ON DELETE CASCADE,
        candidate_id uuid NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (saved_search_id, profile_change_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_candidate_search_match_candidate
      ON public.candidate_search_match (candidate_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE public.saved_search_alert_bucket (
        id uuid PRIMARY KEY,
        recipient_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        frequency text NOT NULL
          CHECK (frequency IN ('immediate', 'daily', 'weekly')),
        window_key text NOT NULL,
        available_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'sent', 'suppressed', 'dead')),
        attempt_count integer NOT NULL DEFAULT 0
          CHECK (attempt_count BETWEEN 0 AND 8),
        locked_at timestamptz,
        last_error_code text,
        sent_at timestamptz,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (recipient_id, frequency, window_key)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_saved_search_alert_bucket_due
      ON public.saved_search_alert_bucket (available_at, created_at)
      WHERE status IN ('pending', 'processing')
    `);
    await queryRunner.query(`
      CREATE TABLE public.saved_search_alert_bucket_item (
        bucket_id uuid NOT NULL
          REFERENCES public.saved_search_alert_bucket(id) ON DELETE CASCADE,
        match_id uuid NOT NULL
          REFERENCES public.candidate_search_match(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'accepted', 'suppressed')),
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (bucket_id, match_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_saved_search_alert_bucket_item_match
      ON public.saved_search_alert_bucket_item (match_id)
    `);
    await queryRunner.query(`
      CREATE TABLE public.saved_search_alert_admin_retry (
        id bigserial PRIMARY KEY,
        bucket_id uuid NOT NULL,
        actor_user_id uuid NOT NULL
          REFERENCES public."user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL
          CHECK (previous_attempt_count BETWEEN 0 AND 8),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_saved_search_alert_admin_retry_bucket
      ON public.saved_search_alert_admin_retry (bucket_id, created_at DESC, id DESC)
    `);
    await queryRunner.query(`
      CREATE TABLE public.candidate_profile_change_admin_retry (
        id bigserial PRIMARY KEY,
        profile_change_id uuid NOT NULL
          REFERENCES public.candidate_profile_change(id) ON DELETE CASCADE,
        actor_user_id uuid NOT NULL
          REFERENCES public."user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL
          CHECK (previous_attempt_count BETWEEN 0 AND 8),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_candidate_profile_change_admin_retry_change
      ON public.candidate_profile_change_admin_retry
        (profile_change_id, created_at DESC, id DESC)
    `);

    for (const table of SAVED_SEARCH_ALERT_TABLES) {
      await queryRunner.query(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      await queryRunner.query(
        `REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated, service_role`,
      );
    }
    await queryRunner.query(`
      REVOKE ALL ON SEQUENCE public.saved_search_alert_admin_retry_id_seq
      FROM PUBLIC, anon, authenticated, service_role
    `);
    await queryRunner.query(`
      REVOKE ALL ON SEQUENCE public.candidate_profile_change_admin_retry_id_seq
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.candidate_profile_change_admin_retry)
          OR EXISTS (SELECT 1 FROM public.saved_search_alert_admin_retry)
          OR EXISTS (SELECT 1 FROM public.saved_search_alert_bucket_item)
          OR EXISTS (SELECT 1 FROM public.saved_search_alert_bucket)
          OR EXISTS (SELECT 1 FROM public.candidate_search_match)
          OR EXISTS (
            SELECT 1 FROM public.candidate_profile_change
            WHERE processed_at IS NOT NULL
               OR match_attempt_count > 0
               OR match_last_error IS NOT NULL
          ) THEN
          RAISE EXCEPTION 'export saved search alert queue data before rollback';
        END IF;
      END;
      $migration$
    `);
    await queryRunner.query(
      'DROP INDEX public.idx_candidate_profile_change_admin_retry_change',
    );
    await queryRunner.query(
      'DROP INDEX public.idx_saved_search_alert_admin_retry_bucket',
    );
    await queryRunner.query(
      'DROP INDEX public.idx_saved_search_alert_bucket_item_match',
    );
    await queryRunner.query(
      'DROP INDEX public.idx_saved_search_alert_bucket_due',
    );
    await queryRunner.query(
      'DROP INDEX public.idx_candidate_search_match_candidate',
    );
    await queryRunner.query(
      'DROP TABLE public.candidate_profile_change_admin_retry',
    );
    await queryRunner.query(
      'DROP TABLE public.saved_search_alert_admin_retry',
    );
    await queryRunner.query(
      'DROP TABLE public.saved_search_alert_bucket_item',
    );
    await queryRunner.query('DROP TABLE public.saved_search_alert_bucket');
    await queryRunner.query('DROP TABLE public.candidate_search_match');
    await queryRunner.query(`
      ALTER TABLE public.candidate_profile_change
        DROP COLUMN match_attempt_count,
        DROP COLUMN match_last_error,
        DROP COLUMN match_failed_at
    `);
  }
}

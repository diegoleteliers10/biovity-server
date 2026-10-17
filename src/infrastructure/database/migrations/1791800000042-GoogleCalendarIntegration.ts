import { MigrationInterface, QueryRunner } from 'typeorm';

export class GoogleCalendarIntegration1791800000042 implements MigrationInterface {
  name = 'GoogleCalendarIntegration1791800000042';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.google_calendar_connection (
        owner_type text NOT NULL CHECK (owner_type IN ('user', 'organization')),
        owner_id uuid NOT NULL,
        account_email text NOT NULL,
        refresh_token_ciphertext text NOT NULL,
        refresh_token_iv text NOT NULL,
        refresh_token_auth_tag text NOT NULL,
        calendar_id text NOT NULL DEFAULT 'primary',
        connected_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (owner_type, owner_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE public.google_calendar_oauth_state (
        state_hash text PRIMARY KEY,
        created_by_user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        owner_type text NOT NULL CHECK (owner_type IN ('user', 'organization')),
        owner_id uuid NOT NULL,
        expires_at timestamptz NOT NULL
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_google_calendar_oauth_state_expiry
      ON public.google_calendar_oauth_state (expires_at)
    `);
    await queryRunner.query(`
      ALTER TABLE public.event
        ADD COLUMN calendar_provider text NOT NULL DEFAULT 'biovity'
          CHECK (calendar_provider IN ('biovity', 'google')),
        ADD COLUMN google_calendar_sync_status text NOT NULL DEFAULT 'not_connected'
          CHECK (google_calendar_sync_status IN ('not_connected', 'synced', 'cancelled', 'failed')),
        ADD COLUMN google_calendar_sync_error text,
        ADD COLUMN google_calendar_synced_at timestamptz
    `);
    await queryRunner.query(`
      ALTER TABLE public.google_calendar_connection ENABLE ROW LEVEL SECURITY;
      ALTER TABLE public.google_calendar_oauth_state ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON public.google_calendar_connection FROM PUBLIC, anon, authenticated, service_role;
      REVOKE ALL ON public.google_calendar_oauth_state FROM PUBLIC, anon, authenticated, service_role;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.event
        DROP COLUMN calendar_provider,
        DROP COLUMN google_calendar_sync_status,
        DROP COLUMN google_calendar_sync_error,
        DROP COLUMN google_calendar_synced_at
    `);
    await queryRunner.query('DROP TABLE public.google_calendar_oauth_state');
    await queryRunner.query('DROP TABLE public.google_calendar_connection');
  }
}

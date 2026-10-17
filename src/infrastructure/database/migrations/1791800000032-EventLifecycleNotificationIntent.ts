import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventLifecycleNotificationIntent1791800000032 implements MigrationInterface {
  name = 'EventLifecycleNotificationIntent1791800000032';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.event_lifecycle_notification_intent (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        kind text NOT NULL CHECK (kind IN ('created', 'rsvp')),
        event_id uuid NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
        participant_id uuid NOT NULL REFERENCES public.event_participant(id) ON DELETE CASCADE,
        recipient_id uuid NOT NULL,
        event_title text NOT NULL,
        event_type text NOT NULL,
        event_start_at timestamptz NOT NULL,
        event_time_zone text NOT NULL,
        actor_user_id uuid NOT NULL,
        actor_name text NOT NULL,
        from_status text,
        to_status text,
        dedup_key text NOT NULL UNIQUE,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'retry', 'accepted', 'suppressed', 'dead')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 8),
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz,
        last_error_code text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK (
          (kind = 'created' AND from_status IS NULL AND to_status IS NULL)
          OR (kind = 'rsvp' AND from_status IS NOT NULL AND to_status IS NOT NULL)
        )
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_event_lifecycle_notification_intent_due
      ON public.event_lifecycle_notification_intent (available_at, created_at)
      WHERE status IN ('pending', 'retry', 'processing')
    `);
    await queryRunner.query(`
      ALTER TABLE public.event_lifecycle_notification_intent
      ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      REVOKE ALL ON public.event_lifecycle_notification_intent
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.event_lifecycle_notification_intent) THEN
          RAISE EXCEPTION 'export event lifecycle notification intents before rollback';
        END IF;
      END;
      $migration$
    `);
    await queryRunner.query(
      'DROP INDEX public.idx_event_lifecycle_notification_intent_due',
    );
    await queryRunner.query(
      'DROP TABLE public.event_lifecycle_notification_intent',
    );
  }
}

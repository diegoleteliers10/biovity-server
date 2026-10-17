import { MigrationInterface, QueryRunner } from 'typeorm';

export class InterviewReminderIntent1791800000038 implements MigrationInterface {
  name = 'InterviewReminderIntent1791800000038';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.interview_reminder_notification_intent (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES public.event(id) ON DELETE CASCADE,
        participant_id uuid NOT NULL REFERENCES public.event_participant(id) ON DELETE CASCADE,
        scheduled_start_at timestamptz NOT NULL,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'retry', 'accepted', 'suppressed', 'cancelled', 'dead')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 8),
        available_at timestamptz NOT NULL,
        locked_at timestamptz,
        last_error_code text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (event_id, participant_id, scheduled_start_at)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_interview_reminder_intent_due
      ON public.interview_reminder_notification_intent (available_at, created_at)
      WHERE status IN ('pending', 'retry', 'processing')
    `);
    await queryRunner.query(`
      CREATE TABLE public.interview_reminder_notification_admin_retry (
        id bigserial PRIMARY KEY,
        intent_id uuid NOT NULL,
        actor_user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL CHECK (previous_attempt_count BETWEEN 0 AND 8),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_interview_reminder_admin_retry_intent
      ON public.interview_reminder_notification_admin_retry (intent_id, created_at DESC, id DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE public.interview_reminder_notification_admin_retry ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      REVOKE ALL ON public.interview_reminder_notification_admin_retry
      FROM PUBLIC, anon, authenticated, service_role
    `);
    await queryRunner.query(`
      REVOKE ALL ON SEQUENCE public.interview_reminder_notification_admin_retry_id_seq
      FROM PUBLIC, anon, authenticated, service_role
    `);
    await queryRunner.query(`
      ALTER TABLE public.interview_reminder_notification_intent ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      REVOKE ALL ON public.interview_reminder_notification_intent
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.interview_reminder_notification_admin_retry) THEN
          RAISE EXCEPTION 'export interview reminder retry audit before rollback';
        END IF;
      END;
      $$
    `);
    await queryRunner.query(
      'DROP INDEX public.idx_interview_reminder_admin_retry_intent',
    );
    await queryRunner.query(
      'DROP TABLE public.interview_reminder_notification_admin_retry',
    );
    await queryRunner.query(
      'DROP TABLE public.interview_reminder_notification_intent',
    );
  }
}

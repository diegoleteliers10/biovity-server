import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventLifecycleNotificationAdminRetry1791800000033 implements MigrationInterface {
  name = 'EventLifecycleNotificationAdminRetry1791800000033';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.event_lifecycle_notification_admin_retry (
        id bigserial PRIMARY KEY,
        intent_id uuid NOT NULL,
        actor_user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL
          CHECK (previous_attempt_count BETWEEN 0 AND 8),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_event_lifecycle_notification_admin_retry_intent
      ON public.event_lifecycle_notification_admin_retry
        (intent_id, created_at DESC, id DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE public.event_lifecycle_notification_admin_retry
      ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      REVOKE ALL ON public.event_lifecycle_notification_admin_retry
      FROM PUBLIC, anon, authenticated, service_role
    `);
    await queryRunner.query(`
      REVOKE ALL ON SEQUENCE
        public.event_lifecycle_notification_admin_retry_id_seq
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM public.event_lifecycle_notification_admin_retry
        ) THEN
          RAISE EXCEPTION 'export event lifecycle retry audit before rollback';
        END IF;
      END;
      $migration$
    `);
    await queryRunner.query(
      'DROP INDEX public.idx_event_lifecycle_notification_admin_retry_intent',
    );
    await queryRunner.query(
      'DROP TABLE public.event_lifecycle_notification_admin_retry',
    );
  }
}

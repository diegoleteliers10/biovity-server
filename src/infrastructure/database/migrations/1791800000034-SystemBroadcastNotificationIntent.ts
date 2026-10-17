import { MigrationInterface, QueryRunner } from 'typeorm';

export class SystemBroadcastNotificationIntent1791800000034 implements MigrationInterface {
  name = 'SystemBroadcastNotificationIntent1791800000034';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE public.system_notification_broadcast (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL REFERENCES public.organization(id) ON DELETE CASCADE,
        actor_user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
        request_id uuid NOT NULL,
        title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 160),
        body text NOT NULL CHECK (length(btrim(body)) BETWEEN 1 AND 2000),
        created_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (actor_user_id, request_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE public.system_notification_broadcast_intent (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        broadcast_id uuid NOT NULL REFERENCES public.system_notification_broadcast(id) ON DELETE CASCADE,
        recipient_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE CASCADE,
        status text NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'retry', 'accepted', 'suppressed', 'dead')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count BETWEEN 0 AND 8),
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz,
        last_error_code text,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (broadcast_id, recipient_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_system_notification_broadcast_intent_due
      ON public.system_notification_broadcast_intent (available_at, created_at)
      WHERE status IN ('pending', 'retry', 'processing')
    `);
    await queryRunner.query(`
      CREATE TABLE public.system_notification_broadcast_admin_retry (
        id bigserial PRIMARY KEY,
        intent_id uuid NOT NULL,
        actor_user_id uuid NOT NULL REFERENCES public."user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL CHECK (previous_attempt_count BETWEEN 0 AND 8),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_system_notification_broadcast_admin_retry_intent
      ON public.system_notification_broadcast_admin_retry (intent_id, created_at DESC, id DESC)
    `);
    for (const table of [
      'system_notification_broadcast',
      'system_notification_broadcast_intent',
      'system_notification_broadcast_admin_retry',
    ]) {
      await queryRunner.query(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      await queryRunner.query(
        `REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated, service_role`,
      );
    }
    await queryRunner.query(`
      REVOKE ALL ON SEQUENCE public.system_notification_broadcast_admin_retry_id_seq
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.system_notification_broadcast_intent)
          OR EXISTS (SELECT 1 FROM public.system_notification_broadcast_admin_retry)
          OR EXISTS (SELECT 1 FROM public.system_notification_broadcast)
        THEN
          RAISE EXCEPTION 'export system broadcast notifications before rollback';
        END IF;
      END;
      $migration$
    `);
    await queryRunner.query(
      'DROP INDEX public.idx_system_notification_broadcast_admin_retry_intent',
    );
    await queryRunner.query(
      'DROP INDEX public.idx_system_notification_broadcast_intent_due',
    );
    await queryRunner.query(
      'DROP TABLE public.system_notification_broadcast_admin_retry',
    );
    await queryRunner.query(
      'DROP TABLE public.system_notification_broadcast_intent',
    );
    await queryRunner.query('DROP TABLE public.system_notification_broadcast');
  }
}

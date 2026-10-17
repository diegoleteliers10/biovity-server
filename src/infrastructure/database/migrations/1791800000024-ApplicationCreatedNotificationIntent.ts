import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationCreatedNotificationIntent1791800000024 implements MigrationInterface {
  name = 'ApplicationCreatedNotificationIntent1791800000024';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE application_created_notification_intent (
        id uuid PRIMARY KEY,
        application_id uuid NOT NULL REFERENCES application(id) ON DELETE CASCADE,
        recipient_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        job_id uuid NOT NULL REFERENCES job(id) ON DELETE CASCADE,
        candidate_name text NOT NULL,
        job_title text NOT NULL,
        status varchar(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'accepted', 'retry', 'dead', 'suppressed')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz,
        last_error_code varchar(80),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (application_id, recipient_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_application_created_notification_due
      ON application_created_notification_intent (available_at, created_at)
      WHERE status IN ('pending', 'retry', 'processing')
    `);
    await queryRunner.query(`
      CREATE TABLE application_created_notification_admin_retry (
        id bigserial PRIMARY KEY,
        intent_id uuid NOT NULL,
        actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL CHECK (previous_attempt_count >= 0),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_application_created_notification_admin_retry_intent
      ON application_created_notification_admin_retry (intent_id, created_at DESC, id DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE application_created_notification_intent ENABLE ROW LEVEL SECURITY;
      ALTER TABLE application_created_notification_admin_retry ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON application_created_notification_intent FROM PUBLIC, anon, authenticated, service_role;
      REVOKE ALL ON application_created_notification_admin_retry FROM PUBLIC, anon, authenticated, service_role;
      REVOKE ALL ON SEQUENCE application_created_notification_admin_retry_id_seq FROM PUBLIC, anon, authenticated, service_role;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM application_created_notification_intent) THEN
          RAISE EXCEPTION 'export application-created notification intents before rollback';
        END IF;
        IF EXISTS (SELECT 1 FROM application_created_notification_admin_retry) THEN
          RAISE EXCEPTION 'export application-created notification retry audit before rollback';
        END IF;
      END $$
    `);
    await queryRunner.query(
      'DROP INDEX idx_application_created_notification_admin_retry_intent',
    );
    await queryRunner.query(
      'DROP TABLE application_created_notification_admin_retry',
    );
    await queryRunner.query(
      'DROP INDEX idx_application_created_notification_due',
    );
    await queryRunner.query(
      'DROP TABLE application_created_notification_intent',
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationStatusNotificationAdminRetry1791800000021 implements MigrationInterface {
  name = 'ApplicationStatusNotificationAdminRetry1791800000021';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE application_status_notification_admin_retry (
        id bigserial PRIMARY KEY,
        intent_id uuid NOT NULL,
        actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL CHECK (previous_attempt_count >= 0),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_application_status_notification_admin_retry_intent
      ON application_status_notification_admin_retry (intent_id, created_at DESC, id DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM application_status_notification_admin_retry) THEN
          RAISE EXCEPTION 'export application status notification retry audit before rollback';
        END IF;
      END;
      $$
    `);
    await queryRunner.query(
      'DROP INDEX idx_application_status_notification_admin_retry_intent',
    );
    await queryRunner.query(
      'DROP TABLE application_status_notification_admin_retry',
    );
  }
}

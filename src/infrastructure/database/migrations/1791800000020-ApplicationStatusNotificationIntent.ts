import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationStatusNotificationIntent1791800000020 implements MigrationInterface {
  name = 'ApplicationStatusNotificationIntent1791800000020';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE application_status_notification_intent (
        id uuid PRIMARY KEY,
        event_key uuid NOT NULL UNIQUE,
        application_id uuid NOT NULL,
        recipient_id uuid NOT NULL,
        job_id uuid NOT NULL,
        application_status varchar(30) NOT NULL,
        job_title text NOT NULL,
        status_label varchar(80) NOT NULL,
        status_history_id uuid NOT NULL UNIQUE,
        status varchar(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'accepted', 'retry', 'dead', 'suppressed')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz,
        last_error_code varchar(80),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_application_status_notification_intent_due
      ON application_status_notification_intent (available_at, created_at)
      WHERE status IN ('pending', 'retry', 'processing')
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX idx_application_status_notification_intent_due',
    );
    await queryRunner.query(
      'DROP TABLE application_status_notification_intent',
    );
  }
}

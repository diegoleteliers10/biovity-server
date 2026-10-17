import { MigrationInterface, QueryRunner } from 'typeorm';

export class MessageNotificationIntent1791800000023 implements MigrationInterface {
  name = 'MessageNotificationIntent1791800000023';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE message_notification_intent (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id uuid NOT NULL REFERENCES message(id) ON DELETE CASCADE,
        chat_id uuid NOT NULL REFERENCES chat(id) ON DELETE CASCADE,
        recipient_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        status varchar(20) NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'processing', 'accepted', 'retry', 'dead', 'suppressed')),
        attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
        available_at timestamptz NOT NULL DEFAULT now(),
        locked_at timestamptz,
        last_error_code varchar(80),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (message_id, recipient_id)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_message_notification_intent_due
      ON message_notification_intent (available_at, created_at)
      WHERE status IN ('pending', 'retry', 'processing')
    `);
    await queryRunner.query(`
      CREATE TABLE message_notification_admin_retry (
        id bigserial PRIMARY KEY,
        intent_id uuid NOT NULL REFERENCES message_notification_intent(id) ON DELETE CASCADE,
        actor_user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        previous_attempt_count integer NOT NULL CHECK (previous_attempt_count >= 0),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_message_notification_admin_retry_intent
      ON message_notification_admin_retry (intent_id, created_at DESC, id DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE message_notification_intent ENABLE ROW LEVEL SECURITY;
      ALTER TABLE message_notification_admin_retry ENABLE ROW LEVEL SECURITY;
      REVOKE ALL ON message_notification_intent FROM PUBLIC, anon, authenticated, service_role;
      REVOKE ALL ON message_notification_admin_retry FROM PUBLIC, anon, authenticated, service_role;
      REVOKE ALL ON SEQUENCE message_notification_admin_retry_id_seq FROM PUBLIC, anon, authenticated, service_role;
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (SELECT 1 FROM message_notification_intent) THEN
          RAISE EXCEPTION 'export message notification intents before rollback';
        END IF;
        IF EXISTS (SELECT 1 FROM message_notification_admin_retry) THEN
          RAISE EXCEPTION 'export message notification retry audit before rollback';
        END IF;
      END $$
    `);
    await queryRunner.query(
      'DROP INDEX idx_message_notification_admin_retry_intent',
    );
    await queryRunner.query('DROP TABLE message_notification_admin_retry');
    await queryRunner.query('DROP INDEX idx_message_notification_intent_due');
    await queryRunner.query('DROP TABLE message_notification_intent');
  }
}

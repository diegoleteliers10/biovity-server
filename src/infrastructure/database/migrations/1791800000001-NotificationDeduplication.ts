import { MigrationInterface, QueryRunner } from 'typeorm';

export class NotificationDeduplication1791800000001 implements MigrationInterface {
  name = 'NotificationDeduplication1791800000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS notification_deduplication (
        user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        type notification_type NOT NULL,
        dedup_key text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        expires_at timestamptz NOT NULL DEFAULT now() + interval '1 hour',
        PRIMARY KEY (user_id, type, dedup_key)
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS idx_notification_deduplication_expires_at
      ON notification_deduplication(expires_at)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS notification_deduplication');
  }
}

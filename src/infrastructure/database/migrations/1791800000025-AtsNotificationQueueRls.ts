import { MigrationInterface, QueryRunner } from 'typeorm';

const INTERNAL_NOTIFICATION_TABLES = [
  'application_created_notification_intent',
  'application_created_notification_admin_retry',
  'application_status_notification_intent',
  'application_status_notification_admin_retry',
  'event_change_notification_intent',
  'event_change_notification_admin_retry',
  'message_notification_intent',
  'message_notification_admin_retry',
] as const;

export class AtsNotificationQueueRls1791800000025 implements MigrationInterface {
  name = 'AtsNotificationQueueRls1791800000025';

  async up(queryRunner: QueryRunner): Promise<void> {
    for (const table of INTERNAL_NOTIFICATION_TABLES) {
      await queryRunner.query(
        `ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,
      );
      await queryRunner.query(
        `REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated, service_role`,
      );
      await queryRunner.query(
        `DO $migration$
         DECLARE sequence_name text;
         BEGIN
           sequence_name := pg_get_serial_sequence('public.${table}', 'id');
           IF sequence_name IS NOT NULL THEN
             EXECUTE format(
               'REVOKE ALL ON SEQUENCE %s FROM PUBLIC, anon, authenticated, service_role',
               sequence_name
             );
           END IF;
         END
         $migration$`,
      );
    }
  }

  down(): Promise<void> {
    // A rollback cannot restore the grants that existed before this migration.
    return Promise.reject(
      new Error(
        'ATS notification queue access hardening cannot be rolled back safely',
      ),
    );
  }
}

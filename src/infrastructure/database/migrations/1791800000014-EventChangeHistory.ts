import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventChangeHistory1791800000014 implements MigrationInterface {
  name = 'EventChangeHistory1791800000014';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE event_change_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES event(id) ON DELETE RESTRICT,
        actor_user_id uuid REFERENCES "user"(id) ON DELETE SET NULL,
        action text NOT NULL CHECK (action IN ('updated', 'cancelled')),
        changes jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_event_change_history_event_created
      ON event_change_history (event_id, created_at, id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX idx_event_change_history_event_created',
    );
    await queryRunner.query('DROP TABLE event_change_history');
  }
}

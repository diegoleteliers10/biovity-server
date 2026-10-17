import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventParticipantStatusHistory1791800000010 implements MigrationInterface {
  name = 'EventParticipantStatusHistory1791800000010';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE event_participant_status_history (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_id uuid NOT NULL REFERENCES event_participant(id) ON DELETE CASCADE,
        event_id uuid NOT NULL REFERENCES event(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        changed_by_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        from_status participant_status_enum NOT NULL,
        to_status participant_status_enum NOT NULL,
        changed_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_event_participant_status_history_participant_changed
      ON event_participant_status_history (participant_id, changed_at)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX idx_event_participant_status_history_participant_changed',
    );
    await queryRunner.query('DROP TABLE event_participant_status_history');
  }
}

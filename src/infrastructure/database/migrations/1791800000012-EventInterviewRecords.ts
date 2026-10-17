import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventInterviewRecords1791800000012 implements MigrationInterface {
  name = 'EventInterviewRecords1791800000012';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE event_interviewer (
        event_id uuid NOT NULL REFERENCES event(id) ON DELETE CASCADE,
        user_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        assigned_by_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        created_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (event_id, user_id)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE event_interview_evaluation (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL REFERENCES event(id) ON DELETE CASCADE,
        evaluator_id uuid NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
        rating text NOT NULL CHECK (rating IN ('positive', 'neutral', 'negative')),
        notes text,
        skills_assessment jsonb NOT NULL DEFAULT '{}'::jsonb,
        recommendation text CHECK (recommendation IN ('advance', 'hold', 'no_advance')),
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (event_id, evaluator_id),
        CHECK (rating = 'positive' OR NULLIF(BTRIM(notes), '') IS NOT NULL)
      )
    `);
    await queryRunner.query(`
      CREATE TABLE event_interview_outcome (
        event_id uuid PRIMARY KEY REFERENCES event(id) ON DELETE CASCADE,
        outcome text NOT NULL CHECK (outcome IN ('advance', 'hold', 'no_advance')),
        decision_maker_id uuid NOT NULL REFERENCES "user"(id) ON DELETE RESTRICT,
        notes text,
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE TABLE event_interview_audit (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id uuid NOT NULL,
        actor_id uuid NOT NULL,
        actor_name text NOT NULL,
        record_type text NOT NULL CHECK (record_type IN ('evaluation', 'outcome')),
        subject_user_id uuid,
        action text NOT NULL CHECK (action IN ('saved', 'changed')),
        before_data jsonb,
        after_data jsonb NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`CREATE INDEX idx_event_interviewer_user ON event_interviewer (user_id)`);
    await queryRunner.query(`CREATE INDEX idx_event_interview_audit_event_time ON event_interview_audit (event_id, created_at)`);
    await queryRunner.query(`
      CREATE FUNCTION reject_event_interview_audit_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'event interview audit records are immutable';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER event_interview_audit_immutable
      BEFORE UPDATE OR DELETE ON event_interview_audit
      FOR EACH ROW EXECUTE FUNCTION reject_event_interview_audit_mutation()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TRIGGER event_interview_audit_immutable ON event_interview_audit');
    await queryRunner.query('DROP FUNCTION reject_event_interview_audit_mutation()');
    await queryRunner.query('DROP INDEX idx_event_interview_audit_event_time');
    await queryRunner.query('DROP INDEX idx_event_interviewer_user');
    await queryRunner.query('DROP TABLE event_interview_audit');
    await queryRunner.query('DROP TABLE event_interview_outcome');
    await queryRunner.query('DROP TABLE event_interview_evaluation');
    await queryRunner.query('DROP TABLE event_interviewer');
  }
}

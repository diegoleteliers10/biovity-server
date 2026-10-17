import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminOperationsQueueAssignment1791800000018 implements MigrationInterface {
  name = 'AdminOperationsQueueAssignment1791800000018';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE admin_operations_queue_assignment (
        kind text NOT NULL CHECK (kind IN ('expired_job', 'organization_without_active_jobs')),
        source_id uuid NOT NULL,
        assigned_admin_id uuid REFERENCES "user"(id) ON DELETE RESTRICT,
        assigned_at timestamptz,
        next_action text,
        target_date date,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now(),
        PRIMARY KEY (kind, source_id),
        CHECK ((assigned_admin_id IS NULL) = (assigned_at IS NULL)),
        CHECK ((assigned_admin_id IS NULL) = (next_action IS NULL AND target_date IS NULL))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_admin_operations_queue_assignment_owner
      ON admin_operations_queue_assignment (assigned_admin_id, kind, target_date)
    `);
    await queryRunner.query(`
      CREATE TABLE admin_operations_queue_assignment_audit (
        id bigserial PRIMARY KEY,
        kind text NOT NULL CHECK (kind IN ('expired_job', 'organization_without_active_jobs')),
        source_id uuid NOT NULL,
        actor_user_id uuid NOT NULL,
        actor_email text NOT NULL,
        action text NOT NULL CHECK (action IN ('claimed', 'released', 'follow_up_scheduled')),
        previous_next_action text,
        previous_target_date date,
        next_action text,
        target_date date,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_admin_operations_queue_assignment_audit_source
      ON admin_operations_queue_assignment_audit (kind, source_id, created_at DESC, id DESC)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM admin_operations_queue_assignment_audit)
          OR EXISTS (SELECT 1 FROM admin_operations_queue_assignment) THEN
          RAISE EXCEPTION 'export admin operations assignments and audit before rollback';
        END IF;
      END;
      $$
    `);
    await queryRunner.query(
      `DROP INDEX idx_admin_operations_queue_assignment_audit_source`,
    );
    await queryRunner.query(
      `DROP TABLE admin_operations_queue_assignment_audit`,
    );
    await queryRunner.query(
      `DROP INDEX idx_admin_operations_queue_assignment_owner`,
    );
    await queryRunner.query(`DROP TABLE admin_operations_queue_assignment`);
  }
}

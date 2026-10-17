import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationOnboardingFollowUp1791800000017 implements MigrationInterface {
  name = 'OrganizationOnboardingFollowUp1791800000017';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE organization_onboarding_assignment
        ADD COLUMN next_action text,
        ADD COLUMN target_date date
    `);
    await queryRunner.query(`
      ALTER TABLE organization_onboarding_assignment_audit
        DROP CONSTRAINT organization_onboarding_assignment_audit_action_check,
        ADD CONSTRAINT organization_onboarding_assignment_audit_action_check
          CHECK (action IN ('claimed', 'released', 'follow_up_scheduled')),
        ADD COLUMN previous_next_action text,
        ADD COLUMN previous_target_date date,
        ADD COLUMN next_action text,
        ADD COLUMN target_date date
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM organization_onboarding_assignment_audit
          WHERE action = 'follow_up_scheduled' OR previous_next_action IS NOT NULL
            OR previous_target_date IS NOT NULL OR next_action IS NOT NULL OR target_date IS NOT NULL
        ) OR EXISTS (
          SELECT 1 FROM organization_onboarding_assignment
          WHERE next_action IS NOT NULL OR target_date IS NOT NULL
        ) THEN
          RAISE EXCEPTION 'export onboarding follow-up plans and audit before rollback';
        END IF;
      END;
      $$
    `);
    await queryRunner.query(`
      ALTER TABLE organization_onboarding_assignment_audit
        DROP CONSTRAINT organization_onboarding_assignment_audit_action_check,
        DROP COLUMN previous_next_action,
        DROP COLUMN previous_target_date,
        DROP COLUMN next_action,
        DROP COLUMN target_date,
        ADD CONSTRAINT organization_onboarding_assignment_audit_action_check
          CHECK (action IN ('claimed', 'released'))
    `);
    await queryRunner.query(`
      ALTER TABLE organization_onboarding_assignment
        DROP COLUMN next_action,
        DROP COLUMN target_date
    `);
  }
}

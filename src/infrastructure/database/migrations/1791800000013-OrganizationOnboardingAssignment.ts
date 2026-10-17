import { MigrationInterface, QueryRunner } from 'typeorm';

export class OrganizationOnboardingAssignment1791800000013
  implements MigrationInterface
{
  name = 'OrganizationOnboardingAssignment1791800000013';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE organization_onboarding_assignment (
        organization_id uuid PRIMARY KEY REFERENCES organization(id) ON DELETE CASCADE,
        admin_user_id uuid REFERENCES "user"(id) ON DELETE CASCADE,
        assigned_at timestamptz,
        updated_at timestamptz NOT NULL DEFAULT now(),
        CHECK ((admin_user_id IS NULL) = (assigned_at IS NULL))
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_organization_onboarding_assignment_admin
      ON organization_onboarding_assignment (admin_user_id)
      WHERE admin_user_id IS NOT NULL
    `);
    await queryRunner.query(`
      CREATE TABLE organization_onboarding_assignment_audit (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        organization_id uuid NOT NULL,
        actor_id uuid NOT NULL,
        actor_email text NOT NULL,
        action text NOT NULL CHECK (action IN ('claimed', 'released')),
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_organization_onboarding_assignment_audit_org_time
      ON organization_onboarding_assignment_audit (organization_id, created_at DESC)
    `);
    await queryRunner.query(`
      CREATE FUNCTION reject_organization_onboarding_assignment_audit_mutation()
      RETURNS trigger AS $$
      BEGIN
        RAISE EXCEPTION 'organization onboarding assignment audit records are immutable';
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER organization_onboarding_assignment_audit_immutable
      BEFORE UPDATE OR DELETE ON organization_onboarding_assignment_audit
      FOR EACH ROW EXECUTE FUNCTION reject_organization_onboarding_assignment_audit_mutation()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM organization_onboarding_assignment)
          OR EXISTS (SELECT 1 FROM organization_onboarding_assignment_audit)
        THEN
          RAISE EXCEPTION 'export onboarding assignments and audit before rollback';
        END IF;
      END;
      $$
    `);
    await queryRunner.query(
      'DROP TRIGGER organization_onboarding_assignment_audit_immutable ON organization_onboarding_assignment_audit',
    );
    await queryRunner.query(
      'DROP FUNCTION reject_organization_onboarding_assignment_audit_mutation()',
    );
    await queryRunner.query(
      'DROP INDEX idx_organization_onboarding_assignment_audit_org_time',
    );
    await queryRunner.query(
      'DROP TABLE organization_onboarding_assignment_audit',
    );
    await queryRunner.query(
      'DROP INDEX idx_organization_onboarding_assignment_admin',
    );
    await queryRunner.query('DROP TABLE organization_onboarding_assignment');
  }
}

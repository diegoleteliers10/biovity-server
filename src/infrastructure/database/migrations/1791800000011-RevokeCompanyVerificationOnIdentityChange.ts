import { MigrationInterface, QueryRunner } from 'typeorm';

export class RevokeCompanyVerificationOnIdentityChange1791800000011 implements MigrationInterface {
  name = 'RevokeCompanyVerificationOnIdentityChange1791800000011';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE FUNCTION revoke_verification_after_organization_profile_change()
      RETURNS trigger AS $$
      BEGIN
        IF NEW.name IS DISTINCT FROM OLD.name
          OR NEW.website IS DISTINCT FROM OLD.website
          OR NULLIF(BTRIM(NEW.description), '') IS NULL
          OR NULLIF(BTRIM(NEW.industry), '') IS NULL
          OR NULLIF(BTRIM(NEW.size), '') IS NULL
          OR (NEW.address ->> 'city') IS DISTINCT FROM (OLD.address ->> 'city')
          OR (NEW.address ->> 'country') IS DISTINCT FROM (OLD.address ->> 'country') THEN
          UPDATE organization
          SET verification_status = 'unverified'
          WHERE id = NEW.id AND verification_status = 'verified';
          IF FOUND THEN
            UPDATE job
            SET status = 'draft'
            WHERE "organizationId" = NEW.id AND status = 'active';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER organization_profile_change_revokes_verification
      AFTER UPDATE OF name, website, description, industry, size, address
      ON organization
      FOR EACH ROW
      EXECUTE FUNCTION revoke_verification_after_organization_profile_change()
    `);
    await queryRunner.query(`
      CREATE FUNCTION revoke_verification_after_owner_change()
      RETURNS trigger AS $$
      DECLARE affected_organization_id uuid;
      BEGIN
        IF NEW.email IS NOT DISTINCT FROM OLD.email
          AND NEW."isEmailVerified" IS NOT DISTINCT FROM OLD."isEmailVerified"
          AND NEW."organizationId" IS NOT DISTINCT FROM OLD."organizationId" THEN
          RETURN NEW;
        END IF;
        FOR affected_organization_id IN
          SELECT DISTINCT organization_id
          FROM (VALUES (OLD."organizationId"), (NEW."organizationId")) AS linked(organization_id)
          WHERE organization_id IS NOT NULL
        LOOP
          UPDATE organization
          SET verification_status = 'unverified'
          WHERE id = affected_organization_id AND verification_status = 'verified';
          IF FOUND THEN
            UPDATE job
            SET status = 'draft'
            WHERE "organizationId" = affected_organization_id AND status = 'active';
          END IF;
        END LOOP;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql
    `);
    await queryRunner.query(`
      CREATE TRIGGER organization_owner_change_revokes_verification
      AFTER UPDATE OF email, "isEmailVerified", "organizationId"
      ON "user"
      FOR EACH ROW
      EXECUTE FUNCTION revoke_verification_after_owner_change()
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER organization_owner_change_revokes_verification ON "user"`,
    );
    await queryRunner.query(
      `DROP FUNCTION revoke_verification_after_owner_change()`,
    );
    await queryRunner.query(
      `DROP TRIGGER organization_profile_change_revokes_verification ON organization`,
    );
    await queryRunner.query(
      `DROP FUNCTION revoke_verification_after_organization_profile_change()`,
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatOrganization1791800000006 implements MigrationInterface {
  name = 'ChatOrganization1791800000006';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat" ADD COLUMN "organizationId" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" ADD CONSTRAINT "FK_chat_organization" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chat_organizationId" ON "chat" ("organizationId")`,
    );
    await queryRunner.query(`
      WITH recruiter_organizations AS (
        SELECT id AS recruiter_id, "organizationId" AS organization_id
        FROM "user"
        WHERE type = 'organization' AND "organizationId" IS NOT NULL
        UNION
        SELECT user_id AS recruiter_id, organization_id
        FROM organization_member
      ), unique_chat_organizations AS (
        SELECT chat.id, MIN(recruiter_organizations.organization_id::text)::uuid AS organization_id
        FROM chat
        JOIN recruiter_organizations
          ON recruiter_organizations.recruiter_id = chat."recruiterId"
        GROUP BY chat.id
        HAVING COUNT(DISTINCT recruiter_organizations.organization_id) = 1
      )
      UPDATE chat
      SET "organizationId" = unique_chat_organizations.organization_id
      FROM unique_chat_organizations
      WHERE chat.id = unique_chat_organizations.id
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_chat_organizationId"`);
    await queryRunner.query(
      `ALTER TABLE "chat" DROP CONSTRAINT "FK_chat_organization"`,
    );
    await queryRunner.query(`ALTER TABLE "chat" DROP COLUMN "organizationId"`);
  }
}

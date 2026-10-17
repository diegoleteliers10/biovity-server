import { MigrationInterface, QueryRunner } from 'typeorm';

export class ChatOrganizationReview1791800000007
  implements MigrationInterface
{
  name = 'ChatOrganizationReview1791800000007';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "chat" ADD COLUMN organization_assignment_actor_id uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" ADD COLUMN organization_assigned_at timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" ADD CONSTRAINT "FK_chat_organization_assignment_actor" FOREIGN KEY (organization_assignment_actor_id) REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" ADD CONSTRAINT "CHK_chat_organization_assignment_audit" CHECK ((organization_assignment_actor_id IS NULL) = (organization_assigned_at IS NULL))`,
    );
    await queryRunner.query(
      `CREATE INDEX "idx_chat_unassigned_review" ON "chat" ("updatedAt" DESC) WHERE "organizationId" IS NULL`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "idx_chat_unassigned_review"`);
    await queryRunner.query(
      `ALTER TABLE "chat" DROP CONSTRAINT "CHK_chat_organization_assignment_audit"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" DROP CONSTRAINT "FK_chat_organization_assignment_actor"`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" DROP COLUMN organization_assigned_at`,
    );
    await queryRunner.query(
      `ALTER TABLE "chat" DROP COLUMN organization_assignment_actor_id`,
    );
  }
}

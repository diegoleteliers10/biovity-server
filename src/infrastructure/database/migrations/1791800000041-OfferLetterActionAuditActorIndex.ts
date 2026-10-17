import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferLetterActionAuditActorIndex1791800000041
  implements MigrationInterface
{
  name = 'OfferLetterActionAuditActorIndex1791800000041';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX idx_offer_letter_action_audit_actor
      ON public.offer_letter_action_audit (actor_id)
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'DROP INDEX public.idx_offer_letter_action_audit_actor',
    );
  }
}

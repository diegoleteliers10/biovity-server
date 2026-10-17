import { MigrationInterface, QueryRunner } from 'typeorm';

export class OfferLetterExpiryActions1791800000040 implements MigrationInterface {
  name = 'OfferLetterExpiryActions1791800000040';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE public.offer_letter
      ADD COLUMN expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
    `);
    await queryRunner.query(`
      UPDATE public.offer_letter
      SET expires_at = now() + interval '7 days'
      WHERE status = 'sent'
    `);
    await queryRunner.query(`
      CREATE INDEX idx_offer_letter_expiry_due
      ON public.offer_letter (expires_at, id)
      WHERE status = 'sent'
    `);
    await queryRunner.query(`
      CREATE TABLE public.offer_letter_action_audit (
        id bigserial PRIMARY KEY,
        offer_id uuid NOT NULL REFERENCES public.offer_letter(id) ON DELETE CASCADE,
        actor_id uuid NULL REFERENCES public."user"(id) ON DELETE SET NULL,
        action varchar(20) NOT NULL CHECK (action IN ('resent', 'cancelled', 'expired')),
        expires_on date NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE INDEX idx_offer_letter_action_audit_offer
      ON public.offer_letter_action_audit (offer_id, created_at DESC, id DESC)
    `);
    await queryRunner.query(`
      ALTER TABLE public.offer_letter_action_audit ENABLE ROW LEVEL SECURITY
    `);
    await queryRunner.query(`
      REVOKE ALL ON public.offer_letter_action_audit
      FROM PUBLIC, anon, authenticated, service_role
    `);
    await queryRunner.query(`
      REVOKE ALL ON SEQUENCE public.offer_letter_action_audit_id_seq
      FROM PUBLIC, anon, authenticated, service_role
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $migration$
      BEGIN
        IF EXISTS (SELECT 1 FROM public.offer_letter_action_audit) THEN
          RAISE EXCEPTION 'export offer letter action audit before rollback';
        END IF;
      END;
      $migration$
    `);
    await queryRunner.query('DROP TABLE public.offer_letter_action_audit');
    await queryRunner.query('DROP INDEX public.idx_offer_letter_expiry_due');
    await queryRunner.query('ALTER TABLE public.offer_letter DROP COLUMN expires_at');
  }
}

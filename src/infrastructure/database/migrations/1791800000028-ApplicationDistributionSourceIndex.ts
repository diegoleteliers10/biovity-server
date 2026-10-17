import { MigrationInterface, QueryRunner } from 'typeorm';

export class ApplicationDistributionSourceIndex1791800000028 implements MigrationInterface {
  name = 'ApplicationDistributionSourceIndex1791800000028';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE INDEX application_distribution_source_fk_idx
        ON public.application (distribution_source_id, "jobId", source_channel);
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX public.application_distribution_source_fk_idx;
    `);
  }
}

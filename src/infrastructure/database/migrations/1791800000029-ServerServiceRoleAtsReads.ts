import { MigrationInterface, QueryRunner } from 'typeorm';

export class ServerServiceRoleAtsReads1791800000029 implements MigrationInterface {
  name = 'ServerServiceRoleAtsReads1791800000029';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      GRANT SELECT ON TABLE
        public.application,
        public.event_participant,
        public.chat,
        public.message
      TO service_role
    `);
  }

  async down(): Promise<void> {
    return Promise.reject(
      new Error('Server route read grants must stay aligned with active application routes'),
    );
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class EventTimeZone1791800000009 implements MigrationInterface {
  name = 'EventTimeZone1791800000009';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE event ADD COLUMN "timeZone" text NOT NULL DEFAULT 'America/Santiago'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE event DROP COLUMN "timeZone"`);
  }
}

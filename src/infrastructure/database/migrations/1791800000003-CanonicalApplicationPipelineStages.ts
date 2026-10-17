import { MigrationInterface, QueryRunner } from 'typeorm';

export class CanonicalApplicationPipelineStages1791800000003 implements MigrationInterface {
  name = 'CanonicalApplicationPipelineStages1791800000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1
          FROM application app
          LEFT JOIN job ON job.id = app."jobId"
          WHERE job.id IS NULL
             OR app.status IS NULL
             OR app.status::text NOT IN (
               'pendiente', 'entrevista', 'oferta', 'contratado', 'rechazado', 'desistido'
             )
        ) THEN
          RAISE EXCEPTION 'Cannot create canonical application stages: application data has an unmapped status or missing job';
        END IF;

        IF EXISTS (
          SELECT 1
          FROM application_status_history history
          WHERE history.new_status IS NULL
             OR history.new_status::text NOT IN (
               'pendiente', 'entrevista', 'oferta', 'contratado', 'rechazado', 'desistido'
             )
             OR (
               history.previous_status IS NOT NULL
               AND history.previous_status::text NOT IN (
                 'pendiente', 'entrevista', 'oferta', 'contratado', 'rechazado', 'desistido'
               )
             )
        ) THEN
          RAISE EXCEPTION 'Cannot create canonical application stages: status history has an unmapped status';
        END IF;
      END $$
    `);
    await queryRunner.query(`
      ALTER TABLE pipeline_stage
        ADD COLUMN status_projection varchar NOT NULL DEFAULT 'pendiente',
        ADD COLUMN system_key varchar,
        ADD COLUMN is_archived boolean NOT NULL DEFAULT false
    `);
    await queryRunner.query(`
      ALTER TABLE pipeline_stage
        ADD CONSTRAINT uq_pipeline_stage_id_job_id UNIQUE (id, job_id)
    `);
    await queryRunner.query(`
      ALTER TABLE pipeline_stage
        ADD CONSTRAINT uq_pipeline_stage_job_system_key UNIQUE (job_id, system_key),
        ADD CONSTRAINT ck_pipeline_stage_status_projection CHECK (
          status_projection IN ('pendiente', 'entrevista', 'oferta', 'contratado', 'rechazado', 'desistido')
        )
    `);
    await queryRunner.query(`
      ALTER TABLE application
        ADD COLUMN pipeline_stage_id uuid
    `);
    await queryRunner.query(`
      ALTER TABLE application_status_history
        ADD COLUMN previous_stage_id uuid,
        ADD COLUMN new_stage_id uuid,
        ADD COLUMN previous_stage_name varchar,
        ADD COLUMN new_stage_name varchar
    `);
    await queryRunner.query(`
      CREATE TABLE pipeline_stage_order_backup_1791800000003 (
        stage_id uuid PRIMARY KEY,
        original_order integer NOT NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO pipeline_stage_order_backup_1791800000003 (stage_id, original_order)
      SELECT id, "order" FROM pipeline_stage
    `);
    await queryRunner.query(`
      UPDATE pipeline_stage SET "order" = "order" + 6
    `);

    await queryRunner.query(`
      INSERT INTO pipeline_stage (id, job_id, name, "order", color, status_projection, system_key, is_archived)
      SELECT gen_random_uuid(), jobs.id,
             CASE WHEN EXISTS (
               SELECT 1 FROM pipeline_stage collision
               WHERE collision.job_id = jobs.id AND collision.name = stages.name
             ) THEN stages.name || ' · ' || stages.system_key || ' · ' || left(jobs.id::text, 8)
             ELSE stages.name END,
             stages.stage_order, stages.color,
             stages.system_key, stages.system_key, false
      FROM job jobs
      CROSS JOIN (VALUES
        ('pendiente', 'Pendiente', 0, '#6366f1'),
        ('entrevista', 'Entrevista', 1, '#0ea5e9'),
        ('oferta', 'Oferta', 2, '#8b5cf6'),
        ('contratado', 'Contratado', 3, '#22c55e'),
        ('rechazado', 'Rechazado', 4, '#ef4444'),
        ('desistido', 'Desistido', 5, '#64748b')
      ) AS stages(system_key, name, stage_order, color)
      WHERE NOT EXISTS (
        SELECT 1 FROM pipeline_stage existing
        WHERE existing.job_id = jobs.id AND existing.system_key = stages.system_key
      )
    `);

    await queryRunner.query(`
      UPDATE pipeline_stage SET status_projection = system_key
      WHERE system_key IN ('pendiente', 'entrevista', 'oferta', 'contratado', 'rechazado', 'desistido')
    `);
    await queryRunner.query(`
      UPDATE application app
      SET pipeline_stage_id = stage.id
      FROM pipeline_stage stage
      WHERE stage.job_id = app."jobId" AND stage.system_key = app.status::text
    `);
    await queryRunner.query(`
      UPDATE application_status_history history
      SET new_stage_id = stage.id, new_stage_name = stage.name
      FROM application app, pipeline_stage stage
      WHERE app.id = history.application_id
        AND stage.job_id = app."jobId"
        AND stage.system_key = history.new_status::text
    `);
    await queryRunner.query(`
      UPDATE application_status_history history
      SET previous_stage_id = stage.id, previous_stage_name = stage.name
      FROM application app, pipeline_stage stage
      WHERE app.id = history.application_id
        AND stage.job_id = app."jobId"
        AND stage.system_key = history.previous_status::text
        AND history.previous_status IS NOT NULL
    `);
    await queryRunner.query(`
      INSERT INTO application_status_history
        (id, application_id, previous_status, new_status, changed_at, changed_by_id, rejection_note, new_stage_id, new_stage_name)
      SELECT gen_random_uuid(), app.id, NULL, app.status, app."createdAt", app."candidateId", NULL, stage.id, stage.name
      FROM application app
      JOIN pipeline_stage stage ON stage.job_id = app."jobId" AND stage.system_key = app.status::text
      WHERE NOT EXISTS (
        SELECT 1 FROM application_status_history history
        WHERE history.application_id = app.id AND history.previous_status IS NULL
      )
    `);
    await queryRunner.query(`
      ALTER TABLE application ALTER COLUMN pipeline_stage_id SET NOT NULL
    `);
    await queryRunner.query(`
      ALTER TABLE application
        ADD CONSTRAINT fk_application_pipeline_stage_job
        FOREIGN KEY (pipeline_stage_id, "jobId")
        REFERENCES pipeline_stage (id, job_id)
        ON DELETE RESTRICT
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE application DROP CONSTRAINT fk_application_pipeline_stage_job`,
    );
    await queryRunner.query(
      `ALTER TABLE application DROP COLUMN pipeline_stage_id`,
    );
    await queryRunner.query(`
      ALTER TABLE application_status_history
        DROP COLUMN previous_stage_id,
        DROP COLUMN new_stage_id,
        DROP COLUMN previous_stage_name,
        DROP COLUMN new_stage_name
    `);
    await queryRunner.query(`
      UPDATE pipeline_stage stage
      SET "order" = backup.original_order
      FROM pipeline_stage_order_backup_1791800000003 backup
      WHERE stage.id = backup.stage_id
    `);
    await queryRunner.query(
      `DROP TABLE pipeline_stage_order_backup_1791800000003`,
    );
    await queryRunner.query(
      `DELETE FROM pipeline_stage WHERE system_key IS NOT NULL`,
    );
    await queryRunner.query(`
      ALTER TABLE pipeline_stage
        DROP CONSTRAINT uq_pipeline_stage_id_job_id,
        DROP CONSTRAINT uq_pipeline_stage_job_system_key,
        DROP CONSTRAINT ck_pipeline_stage_status_projection,
        DROP COLUMN status_projection,
        DROP COLUMN system_key,
        DROP COLUMN is_archived
    `);
  }
}

import { DataSource, EntitySchema } from 'typeorm';
import { Application } from '../../core/domain/entities/application.entity';
import { ApplicationStatus } from '../../core/domain/enums';
import { ApplicationRepositoryImpl } from './application.repository.impl';
import { ApplicationEntity } from '../database/orm/application.entity';
import { ApplicationStatusHistoryEntity } from '../database/orm/application-status-history.entity';
import { JobEntity } from '../database/orm/job.entity';
import { PipelineStageEntity } from '../database/orm/pipeline-stage.entity';

const localPostgresUrl = process.env.ATS07_LOCAL_POSTGRES_URL;
const isLocalPostgresUrl = (value?: string): value is string => {
  if (
    !value ||
    !/^postgres(?:ql)?:\/\/(?:[^@/]+@)?(?:localhost|127\.0\.0\.1)(?::\d+)?\//.test(
      value,
    )
  )
    return false;
  const query = value.split('?')[1]?.split('#')[0] ?? '';
  for (const [key] of new URLSearchParams(query)) {
    if (key.toLowerCase() === 'host' || key.toLowerCase() === 'hostaddr')
      return false;
  }
  return true;
};
const describeLocalPostgres = isLocalPostgresUrl(localPostgresUrl)
  ? describe
  : describe.skip;

describeLocalPostgres('ApplicationRepositoryImpl with local PostgreSQL', () => {
  const schema = `ats07_${crypto.randomUUID().replaceAll('-', '')}`;
  let adminDataSource: DataSource;
  let dataSource: DataSource;
  let repository: ApplicationRepositoryImpl;

  beforeAll(async () => {
    adminDataSource = new DataSource({
      type: 'postgres',
      url: localPostgresUrl,
      entities: [],
      synchronize: false,
    });
    await adminDataSource.initialize();
    await adminDataSource.query(`CREATE SCHEMA "${schema}"`);

    dataSource = new DataSource({
      type: 'postgres',
      url: localPostgresUrl,
      schema,
      extra: { options: `-c search_path=${schema},public` },
      entities: [
        new EntitySchema<ApplicationEntity>({
          target: ApplicationEntity,
          name: 'ApplicationEntity',
          tableName: 'application',
          columns: {
            id: { type: 'uuid', primary: true },
            jobId: { name: 'jobId', type: 'uuid' },
            candidateId: { name: 'candidateId', type: 'uuid' },
            createdAt: { type: 'timestamptz' },
            updatedAt: { type: 'timestamptz' },
            stageChangedAt: { type: 'timestamptz' },
            status: { type: 'varchar' },
            coverLetter: { type: 'text', nullable: true },
            salaryMin: { type: 'numeric', nullable: true },
            salaryMax: { type: 'numeric', nullable: true },
            salaryCurrency: { type: 'varchar', nullable: true },
            availabilityDate: { type: 'date', nullable: true },
            resumeUrl: { type: 'text', nullable: true },
            pipelineStageId: {
              name: 'pipeline_stage_id',
              type: 'uuid',
              nullable: true,
            },
            assigneeId: { type: 'uuid', nullable: true },
            nextAction: { type: 'text', nullable: true },
            targetDate: { type: 'date', nullable: true },
            sourceChannel: { type: 'varchar' },
            sourceMethod: { type: 'varchar' },
            distributionSourceId: { type: 'uuid', nullable: true },
          },
        }),
        new EntitySchema<ApplicationStatusHistoryEntity>({
          target: ApplicationStatusHistoryEntity,
          name: 'ApplicationStatusHistoryEntity',
          tableName: 'application_status_history',
          columns: {
            id: { type: 'uuid', primary: true, generated: 'uuid' },
            applicationId: { name: 'application_id', type: 'uuid' },
            previousStatus: {
              name: 'previous_status',
              type: 'varchar',
              nullable: true,
            },
            newStatus: { name: 'new_status', type: 'varchar' },
            changedAt: {
              name: 'changed_at',
              type: 'timestamp',
              default: () => 'now()',
            },
            changedById: {
              name: 'changed_by_id',
              type: 'uuid',
              nullable: true,
            },
            rejectionNote: {
              name: 'rejection_note',
              type: 'text',
              nullable: true,
            },
            rejectionReasonId: {
              name: 'rejection_reason_id',
              type: 'uuid',
              nullable: true,
            },
            rejectionReasonSnapshot: {
              name: 'rejection_reason_snapshot',
              type: 'varchar',
              nullable: true,
            },
            previousStageId: {
              name: 'previous_stage_id',
              type: 'uuid',
              nullable: true,
            },
            newStageId: { name: 'new_stage_id', type: 'uuid', nullable: true },
            previousStageName: {
              name: 'previous_stage_name',
              type: 'varchar',
              nullable: true,
            },
            newStageName: {
              name: 'new_stage_name',
              type: 'varchar',
              nullable: true,
            },
            transitionKind: {
              name: 'transition_kind',
              type: 'varchar',
              default: 'stage',
            },
            transitionNote: {
              name: 'transition_note',
              type: 'text',
              nullable: true,
            },
          },
        }),
        new EntitySchema<JobEntity>({
          target: JobEntity,
          name: 'JobEntity',
          tableName: 'job',
          columns: {
            id: { type: 'uuid', primary: true },
            title: { type: 'varchar' },
          },
        }),
        new EntitySchema<PipelineStageEntity>({
          target: PipelineStageEntity,
          name: 'PipelineStageEntity',
          tableName: 'pipeline_stage',
          columns: {
            id: { type: 'uuid', primary: true },
            jobId: { name: 'job_id', type: 'uuid' },
            name: { type: 'varchar' },
            statusProjection: { name: 'status_projection', type: 'varchar' },
            systemKey: { name: 'system_key', type: 'varchar', nullable: true },
            isArchived: {
              name: 'is_archived',
              type: 'boolean',
              default: false,
            },
            order: { type: 'integer', default: 0 },
            color: { type: 'varchar', default: '#6366f1' },
          },
        }),
      ],
      synchronize: true,
      dropSchema: false,
    });
    await dataSource.initialize();
    await dataSource.query(`
      CREATE TABLE "${schema}".application_status_notification_intent (
        id uuid PRIMARY KEY,
        event_key uuid NOT NULL UNIQUE,
        application_id uuid NOT NULL,
        recipient_id uuid NOT NULL,
        job_id uuid NOT NULL,
        application_status text NOT NULL,
        job_title text NOT NULL,
        status_label text NOT NULL,
        status_history_id uuid NOT NULL,
        available_at timestamptz NOT NULL
      );
    `);
    repository = new ApplicationRepositoryImpl(
      dataSource.getRepository(ApplicationEntity),
      dataSource,
    );
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) await dataSource.destroy();
    if (adminDataSource?.isInitialized) {
      await adminDataSource.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      await adminDataSource.destroy();
    }
  });

  it('persists an application and its initial status history together', async () => {
    const id = crypto.randomUUID();
    const application = new Application(
      id,
      crypto.randomUUID(),
      crypto.randomUUID(),
      new Date(),
      new Date(),
      ApplicationStatus.PENDIENTE,
    );

    await repository.create(application);

    await expect(
      dataSource.query(
        `SELECT history.new_status AS status
         FROM "${schema}".application_status_history history
         JOIN "${schema}".application ON application.id = history.application_id
         WHERE application.id = $1`,
        [id],
      ),
    ).resolves.toEqual([{ status: ApplicationStatus.PENDIENTE }]);
  });

  it('rolls back the application when its history insert fails', async () => {
    await dataSource.query(
      `ALTER TABLE "${schema}".application_status_history
       ADD CONSTRAINT ats07_reject_history
       CHECK (new_status <> 'pendiente') NOT VALID`,
    );
    const id = crypto.randomUUID();
    const application = new Application(
      id,
      crypto.randomUUID(),
      crypto.randomUUID(),
      new Date(),
      new Date(),
      ApplicationStatus.PENDIENTE,
    );

    await expect(repository.create(application)).rejects.toBeDefined();
    await expect(
      dataSource.query(`SELECT id FROM "${schema}".application WHERE id = $1`, [
        id,
      ]),
    ).resolves.toEqual([]);
    await dataSource.query(
      `ALTER TABLE "${schema}".application_status_history DROP CONSTRAINT ats07_reject_history`,
    );
  });

  it('commits stage transition, history, and durable notice atomically', async () => {
    const applicationId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const candidateId = crypto.randomUUID();
    const previousStageId = crypto.randomUUID();
    const nextStageId = crypto.randomUUID();
    const changedById = crypto.randomUUID();
    await dataSource.query(
      `INSERT INTO "${schema}".job (id, title) VALUES ($1, 'Scientist')`,
      [jobId],
    );
    await dataSource.query(
      `INSERT INTO "${schema}".pipeline_stage
       (id, job_id, name, status_projection, is_archived)
       VALUES ($1, $3, 'Pending', 'pendiente', false),
              ($2, $3, 'Interview', 'entrevista', false)`,
      [previousStageId, nextStageId, jobId],
    );
    await dataSource.query(
      `INSERT INTO "${schema}".application
       (id, "jobId", "candidateId", "createdAt", "updatedAt", "stageChangedAt",
        status, pipeline_stage_id, "sourceChannel", "sourceMethod")
       VALUES ($1, $2, $3, now(), now(), now(), 'pendiente', $4, 'unknown', 'unknown')`,
      [applicationId, jobId, candidateId, previousStageId],
    );
    jest.spyOn(repository, 'findById').mockResolvedValue(null);

    await repository.transitionStage({
      id: applicationId,
      stageId: nextStageId,
      changedById,
      rejectionNote: null,
    });

    await expect(
      dataSource.query(
        `SELECT application.status, application.pipeline_stage_id,
                history.previous_status, history.new_status,
                history.previous_stage_id, history.new_stage_id,
                intent.recipient_id, intent.status_history_id
         FROM "${schema}".application application
         JOIN "${schema}".application_status_history history
           ON history.application_id = application.id
         JOIN "${schema}".application_status_notification_intent intent
           ON intent.application_id = application.id
         WHERE application.id = $1`,
        [applicationId],
      ),
    ).resolves.toEqual([
      {
        status: ApplicationStatus.ENTREVISTA,
        pipeline_stage_id: nextStageId,
        previous_status: ApplicationStatus.PENDIENTE,
        new_status: ApplicationStatus.ENTREVISTA,
        previous_stage_id: previousStageId,
        new_stage_id: nextStageId,
        recipient_id: candidateId,
        status_history_id: expect.any(String),
      },
    ]);
  });

  it('reopens a closed application with a reason and durable history', async () => {
    const applicationId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const candidateId = crypto.randomUUID();
    const closedStageId = crypto.randomUUID();
    const openStageId = crypto.randomUUID();
    const changedById = crypto.randomUUID();
    await dataSource.query(
      `INSERT INTO "${schema}".job (id, title) VALUES ($1, 'Scientist')`,
      [jobId],
    );
    await dataSource.query(
      `INSERT INTO "${schema}".pipeline_stage
       (id, job_id, name, status_projection, is_archived)
       VALUES ($1, $3, 'Rejected', 'rechazado', false),
              ($2, $3, 'Pending', 'pendiente', false)`,
      [closedStageId, openStageId, jobId],
    );
    await dataSource.query(
      `INSERT INTO "${schema}".application
       (id, "jobId", "candidateId", "createdAt", "updatedAt", "stageChangedAt",
        status, pipeline_stage_id, "sourceChannel", "sourceMethod")
       VALUES ($1, $2, $3, now(), now(), now(), 'rechazado', $4, 'unknown', 'unknown')`,
      [applicationId, jobId, candidateId, closedStageId],
    );
    jest.spyOn(repository, 'findById').mockResolvedValue(null);

    await repository.reopen({
      id: applicationId,
      stageId: openStageId,
      changedById,
      reason: 'The role reopened',
    });

    const rows = await dataSource.query(
      `SELECT application.status, history.transition_kind,
              history.transition_note, intent.application_status
       FROM "${schema}".application application
       JOIN "${schema}".application_status_history history
         ON history.application_id = application.id
       JOIN "${schema}".application_status_notification_intent intent
         ON intent.application_id = application.id
       WHERE application.id = $1`,
      [applicationId],
    );
    expect(rows).toEqual([
      {
        status: ApplicationStatus.PENDIENTE,
        transition_kind: 'reopen',
        transition_note: 'The role reopened',
        application_status: ApplicationStatus.PENDIENTE,
      },
    ]);
  });

  it('serializes duplicate concurrent stage transitions', async () => {
    const applicationId = crypto.randomUUID();
    const jobId = crypto.randomUUID();
    const candidateId = crypto.randomUUID();
    const previousStageId = crypto.randomUUID();
    const nextStageId = crypto.randomUUID();
    await dataSource.query(
      `INSERT INTO "${schema}".job (id, title) VALUES ($1, 'Scientist')`,
      [jobId],
    );
    await dataSource.query(
      `INSERT INTO "${schema}".pipeline_stage
       (id, job_id, name, status_projection, is_archived)
       VALUES ($1, $3, 'Pending', 'pendiente', false),
              ($2, $3, 'Interview', 'entrevista', false)`,
      [previousStageId, nextStageId, jobId],
    );
    await dataSource.query(
      `INSERT INTO "${schema}".application
       (id, "jobId", "candidateId", "createdAt", "updatedAt", "stageChangedAt",
        status, pipeline_stage_id, "sourceChannel", "sourceMethod")
       VALUES ($1, $2, $3, now(), now(), now(), 'pendiente', $4, 'unknown', 'unknown')`,
      [applicationId, jobId, candidateId, previousStageId],
    );
    await dataSource.query(`
      CREATE FUNCTION "${schema}".ats07_delay_application_update()
      RETURNS trigger LANGUAGE plpgsql AS $$
      BEGIN
        PERFORM pg_sleep(0.15);
        RETURN NEW;
      END;
      $$;
      CREATE TRIGGER ats07_delay_application_update
      BEFORE UPDATE OF status ON "${schema}".application
      FOR EACH ROW EXECUTE FUNCTION "${schema}".ats07_delay_application_update();
    `);
    jest.spyOn(repository, 'findById').mockResolvedValue(null);
    const input = {
      id: applicationId,
      stageId: nextStageId,
      changedById: crypto.randomUUID(),
      rejectionNote: null,
    };

    await Promise.all([
      repository.transitionStage(input),
      repository.transitionStage(input),
    ]);

    const history = await dataSource.query(
      `SELECT id FROM "${schema}".application_status_history
       WHERE application_id = $1`,
      [applicationId],
    );
    const notices = await dataSource.query(
      `SELECT id FROM "${schema}".application_status_notification_intent
       WHERE application_id = $1`,
      [applicationId],
    );
    expect(history).toHaveLength(1);
    expect(notices).toHaveLength(1);
  });
});

import type { DataSource, QueryRunner } from 'typeorm';
import {
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
} from '../../infrastructure/database/orm';
import { ApplicationStatus } from '../domain/enums';
import { ApplicationService } from './application.service';

const originalWebAppUrl = process.env.WEB_APP_URL;

afterEach(() => {
  if (originalWebAppUrl === undefined) {
    delete process.env.WEB_APP_URL;
  } else {
    process.env.WEB_APP_URL = originalWebAppUrl;
  }
  jest.restoreAllMocks();
});

describe('ApplicationService.createApplication', () => {
  it('locks and snapshots the current CV before it commits the application', async () => {
    process.env.WEB_APP_URL = 'https://preview.biovity.cl/';
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue(new Response(null, { status: 204 }));
    const commitTransaction = jest.fn();
    const rollbackTransaction = jest.fn();
    const insert = jest.fn((_entity: unknown, _values: unknown) =>
      Promise.resolve(),
    );
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 'stage-pending',
        name: 'Pendiente',
      }),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) =>
          Promise.resolve(value),
        ),
      query: jest.fn().mockImplementation((sql: string) =>
        Promise.resolve(
          sql.includes('SELECT source_channel')
            ? [{ source_channel: 'linkedin' }]
            : sql.includes('SELECT "cvFile"->>')
              ? [
                  {
                    path: 'cv/candidate-1/current.pdf',
                    url: 'https://storage.test/cv/candidate-1/current.pdf',
                  },
                ]
              : sql.includes('SELECT id FROM "user"')
                ? [{ id: 'recruiter-1' }]
                : [],
        ),
      ),
      insert,
    };
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager,
      commitTransaction,
      rollbackTransaction,
      release: jest.fn(),
    } as unknown as QueryRunner;
    const service = new ApplicationService(
      { findByJobAndCandidate: jest.fn().mockResolvedValue(null) } as never,
      {
        findById: jest.fn().mockResolvedValue({
          id: 'job-1',
          title: 'Role',
          organizationId: 'org-1',
        }),
      } as never,
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'candidate-1', name: 'Candidate' }),
        findIdsByOrganizationId: jest.fn().mockResolvedValue([]),
      } as never,
      { findByJobId: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      {
        findById: jest.fn().mockResolvedValue({
          integrations: {
            enabled: true,
            slackWebhookUrl: 'https://hooks.slack.test',
          },
        }),
      } as never,
      {
        createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      } as unknown as DataSource,
      { error: jest.fn() } as never,
    );

    const application = await service.createApplication({
      jobId: 'job-1',
      candidateId: 'candidate-1',
      sourceChannel: 'referral',
      distributionSourceId: 'source-id',
      resumeUrl: 'https://storage.test/cv/candidate-1/current.pdf?token=one',
    });
    expect(application).not.toBeNull();
    if (!application) return;

    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('disabled_at IS NULL'),
      ['source-id', 'job-1'],
    );
    expect(manager.save).toHaveBeenCalledWith(
      ApplicationEntity,
      expect.objectContaining({
        sourceChannel: 'linkedin',
        sourceMethod: 'tracked_link',
        distributionSourceId: 'source-id',
        resumeUrl: 'cv/candidate-1/current.pdf',
      }),
    );

    expect(manager.save).toHaveBeenCalledWith(
      ApplicationEntity,
      expect.objectContaining({
        status: ApplicationStatus.PENDIENTE,
        pipelineStageId: 'stage-pending',
      }),
    );
    expect(insert).toHaveBeenCalledWith(
      ApplicationStatusHistoryEntity,
      expect.objectContaining({
        applicationId: application.id,
        previousStatus: null,
        newStatus: ApplicationStatus.PENDIENTE,
        changedById: 'candidate-1',
        newStageId: 'stage-pending',
        newStageName: 'Pendiente',
      }),
    );
    expect(commitTransaction).toHaveBeenCalledTimes(1);
    const cvLockCall = manager.query.mock.calls.findIndex(([sql]) =>
      sql.includes('FOR SHARE'),
    );
    const saveCall = manager.save.mock.calls.findIndex(
      ([entity]) => entity === ApplicationEntity,
    );
    expect(cvLockCall).toBeGreaterThanOrEqual(0);
    expect(manager.query.mock.invocationCallOrder[cvLockCall]).toBeLessThan(
      manager.save.mock.invocationCallOrder[saveCall] ??
        Number.MAX_SAFE_INTEGER,
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining('id <> $3::uuid'),
      ['org-1', 'organization', 'candidate-1'],
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO application_created_notification_intent',
      ),
      expect.arrayContaining([
        expect.any(String),
        application.id,
        'recruiter-1',
        'job-1',
        'Candidate',
        'Role',
      ]),
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy.mock.calls[0]?.[1]?.body).toContain(
      'https://preview.biovity.cl/dashboard/applications',
    );
  });

  it('rejects an inactive or foreign-job distribution token before saving', async () => {
    const rollbackTransaction = jest.fn();
    const manager = {
      findOne: jest.fn(),
      save: jest.fn(),
      query: jest.fn().mockResolvedValue([]),
    };
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager,
      commitTransaction: jest.fn(),
      rollbackTransaction,
      release: jest.fn(),
    } as unknown as QueryRunner;
    const service = new ApplicationService(
      { findByJobAndCandidate: jest.fn().mockResolvedValue(null) } as never,
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'job-1', organizationId: 'org-1' }),
      } as never,
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'candidate-1', name: 'Candidate' }),
      } as never,
      { findByJobId: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      {} as never,
      {
        createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      } as unknown as DataSource,
      { error: jest.fn() } as never,
    );

    await expect(
      service.createApplication({
        jobId: 'job-1',
        candidateId: 'candidate-1',
        distributionSourceId: 'source-id',
      }),
    ).resolves.toBeNull();
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(manager.save).not.toHaveBeenCalled();
  });

  it('rolls back application creation when it cannot save a notification intent', async () => {
    const manager = {
      findOne: jest.fn().mockResolvedValue({
        id: 'stage-pending',
        name: 'Pendiente',
      }),
      save: jest
        .fn()
        .mockImplementation((_entity: unknown, value: unknown) =>
          Promise.resolve(value),
        ),
      insert: jest.fn(),
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'recruiter-1' }])
        .mockRejectedValueOnce(new Error('intent insert failed')),
    };
    const commitTransaction = jest.fn();
    const rollbackTransaction = jest.fn();
    const queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      manager,
      commitTransaction,
      rollbackTransaction,
      release: jest.fn(),
    } as unknown as QueryRunner;
    const service = new ApplicationService(
      {
        findByJobAndCandidate: jest.fn().mockResolvedValue(null),
      } as never,
      {
        findById: jest.fn().mockResolvedValue({
          id: 'job-1',
          title: 'Role',
          organizationId: 'org-1',
        }),
      } as never,
      {
        findById: jest
          .fn()
          .mockResolvedValue({ id: 'candidate-1', name: 'Candidate' }),
      } as never,
      { findByJobId: jest.fn().mockResolvedValue([]) } as never,
      {} as never,
      {} as never,
      {
        createQueryRunner: jest.fn().mockReturnValue(queryRunner),
      } as unknown as DataSource,
      {} as never,
    );

    await expect(
      service.createApplication({ jobId: 'job-1', candidateId: 'candidate-1' }),
    ).rejects.toThrow('intent insert failed');

    expect(commitTransaction).not.toHaveBeenCalled();
    expect(rollbackTransaction).toHaveBeenCalledTimes(1);
  });
});

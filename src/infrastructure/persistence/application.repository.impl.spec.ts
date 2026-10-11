import { ApplicationStatus } from '../../core/domain/enums';
import { Application } from '../../core/domain/entities/application.entity';
import { ApplicationStatusHistoryEntity } from '../database/orm';
import { BadRequestException } from '@nestjs/common';
import { ApplicationRepositoryImpl } from './application.repository.impl';

describe('ApplicationRepositoryImpl create', () => {
  const applicationCreatedAt = new Date('2026-10-10T12:00:00.000Z');
  const savedApplication = {
    id: 'application-id',
    jobId: 'job-id',
    candidateId: 'candidate-id',
    createdAt: applicationCreatedAt,
    updatedAt: applicationCreatedAt,
    stageChangedAt: applicationCreatedAt,
    status: ApplicationStatus.PENDIENTE,
  };
  const application = new Application(
    'application-id',
    'job-id',
    'candidate-id',
    applicationCreatedAt,
    applicationCreatedAt,
    ApplicationStatus.PENDIENTE,
    applicationCreatedAt,
  );

  it('inserts the initial status-history record after saving the application', async () => {
    const manager = {
      save: jest.fn().mockResolvedValue(savedApplication),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new ApplicationRepositoryImpl(
      {} as never,
      dataSource as never,
    );

    const result = await repository.create(application);

    expect(result.id).toBe('application-id');
    expect(manager.insert).toHaveBeenCalledWith(
      ApplicationStatusHistoryEntity,
      {
        applicationId: 'application-id',
        previousStatus: null,
        newStatus: ApplicationStatus.PENDIENTE,
        changedAt: applicationCreatedAt,
        changedById: 'candidate-id',
      },
    );
    expect(manager.save.mock.invocationCallOrder[0]).toBeLessThan(
      manager.insert.mock.invocationCallOrder[0],
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('propagates a rejected initial status-history insert after saving the application', async () => {
    const insertError = new Error('status history insert failed');
    const manager = {
      save: jest.fn().mockResolvedValue(savedApplication),
      insert: jest.fn().mockRejectedValue(insertError),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new ApplicationRepositoryImpl(
      {} as never,
      dataSource as never,
    );

    await expect(repository.create(application)).rejects.toBe(insertError);

    expect(manager.save).toHaveBeenCalledTimes(1);
    expect(manager.insert).toHaveBeenCalledWith(
      ApplicationStatusHistoryEntity,
      expect.objectContaining({ applicationId: 'application-id' }),
    );
    expect(manager.save.mock.invocationCallOrder[0]).toBeLessThan(
      manager.insert.mock.invocationCallOrder[0],
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});

describe('ApplicationRepositoryImpl status history', () => {
  it('stores the rejection note with the status transition in one transaction', async () => {
    const transactionManager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          status: ApplicationStatus.PENDIENTE,
          pipelineStageId: 'pending-stage',
          pipelineStage: { id: 'pending-stage', name: 'Pendiente' },
        })
        .mockResolvedValueOnce({
          id: 'rejected-stage',
          jobId: 'job-id',
          name: 'Rechazado',
          statusProjection: ApplicationStatus.RECHAZADO,
          systemKey: ApplicationStatus.RECHAZADO,
          isArchived: false,
        })
        .mockResolvedValueOnce({
          id: 'pending-stage',
          jobId: 'job-id',
          name: 'Pendiente',
          statusProjection: ApplicationStatus.PENDIENTE,
          systemKey: ApplicationStatus.PENDIENTE,
          isArchived: false,
        }),
      update: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
    };
    type TransactionManager = typeof transactionManager;
    const dataSource = {
      transaction: jest.fn(
        async (operation: (manager: TransactionManager) => unknown) =>
          operation(transactionManager),
      ),
    };
    const applicationRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'application-id',
        jobId: 'job-id',
        candidateId: 'candidate-id',
        createdAt: new Date('2026-10-09T12:00:00Z'),
        updatedAt: new Date('2026-10-09T12:00:00Z'),
        stageChangedAt: new Date('2026-10-09T12:00:00Z'),
        status: ApplicationStatus.RECHAZADO,
      }),
    };
    const repository = new ApplicationRepositoryImpl(
      applicationRepository as never,
      dataSource as never,
    );

    await repository.update({
      id: 'application-id',
      status: ApplicationStatus.RECHAZADO,
      changedById: 'recruiter-id',
      rejectionNote: 'Experiencia insuficiente para este cargo',
    });

    expect(transactionManager.update).toHaveBeenCalledWith(
      expect.anything(),
      'application-id',
      expect.objectContaining({ status: ApplicationStatus.RECHAZADO }),
    );
    expect(transactionManager.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        applicationId: 'application-id',
        previousStatus: ApplicationStatus.PENDIENTE,
        newStatus: ApplicationStatus.RECHAZADO,
        changedById: 'recruiter-id',
        rejectionNote: 'Experiencia insuficiente para este cargo',
      }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});

describe('ApplicationRepositoryImpl pipeline transitions', () => {
  it('rejects an archived stage before it can become the application stage', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          status: ApplicationStatus.PENDIENTE,
          pipelineStageId: 'pending-stage',
          pipelineStage: { id: 'pending-stage', name: 'Pendiente' },
        })
        .mockResolvedValueOnce({
          id: 'archived-stage',
          jobId: 'job-id',
          statusProjection: ApplicationStatus.ENTREVISTA,
          isArchived: true,
        }),
      update: jest.fn(),
      insert: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new ApplicationRepositoryImpl(
      { findOne: jest.fn() } as never,
      dataSource as never,
    );

    await expect(
      repository.transitionStage({
        id: 'application-id',
        stageId: 'archived-stage',
        changedById: 'recruiter-id',
        rejectionNote: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });
});

describe('ApplicationRepositoryImpl hiring plan', () => {
  it('validates a same-organization recruiter and stores the plan in one transaction', async () => {
    const saved = {
      id: 'application-id',
      jobId: 'job-id',
      candidateId: 'candidate-id',
      assigneeId: 'recruiter-id',
      nextAction: 'Llamar al candidato',
      targetDate: '2026-11-30',
    };
    const applicationRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(saved),
    };
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ organizationId: 'organization-id' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ id: 'membership-id' }]),
      getRepository: jest.fn().mockReturnValue(applicationRepository),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new ApplicationRepositoryImpl(
      {} as never,
      dataSource as never,
    );

    const result = await repository.updateHiringPlan({
      id: 'application-id',
      assigneeId: 'recruiter-id',
      nextAction: 'Llamar al candidato',
      targetDate: '2026-11-30',
    });

    expect(result?.assigneeId).toBe('recruiter-id');
    expect(applicationRepository.update).toHaveBeenCalledWith(
      { id: 'application-id' },
      expect.objectContaining({
        assigneeId: 'recruiter-id',
        nextAction: 'Llamar al candidato',
        targetDate: '2026-11-30',
      }),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a viewer or user from another organization as assignee', async () => {
    const applicationRepository = { update: jest.fn() };
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ organizationId: 'organization-id' }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      getRepository: jest.fn().mockReturnValue(applicationRepository),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const repository = new ApplicationRepositoryImpl(
      {} as never,
      dataSource as never,
    );

    await expect(
      repository.updateHiringPlan({
        id: 'application-id',
        assigneeId: 'outside-recruiter',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(applicationRepository.update).not.toHaveBeenCalled();
  });
});

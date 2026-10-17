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
        async (operation: (value: typeof manager) => unknown) => {
          return await operation(manager);
        },
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
        async (operation: (value: typeof manager) => unknown) => {
          return await operation(manager);
        },
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
  it('stores the reason snapshot and note with the status transition in one transaction', async () => {
    const transactionManager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          candidateId: 'candidate-id',
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
        })
        .mockResolvedValueOnce({
          id: 'job-id',
          organizationId: 'organization-id',
        })
        .mockResolvedValueOnce({
          id: 'reason-id',
          label: 'Experiencia insuficiente',
          organizationId: 'organization-id',
          active: true,
        })
        .mockResolvedValueOnce({ id: 'job-id', title: 'Lab role' }),
      update: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockResolvedValue(undefined),
    };
    type TransactionManager = typeof transactionManager;
    const dataSource = {
      transaction: jest.fn(
        async (operation: (manager: TransactionManager) => unknown) => {
          return await operation(transactionManager);
        },
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
      rejectionReasonId: 'reason-id',
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
        rejectionReasonId: 'reason-id',
        rejectionReasonSnapshot: 'Experiencia insuficiente',
      }),
    );
    expect(transactionManager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO application_status_notification_intent',
      ),
      expect.arrayContaining([
        expect.any(String),
        'application-id',
        'candidate-id',
        'job-id',
        ApplicationStatus.RECHAZADO,
        'Lab role',
        'Rechazado',
      ]),
    );
    expect(transactionManager.insert.mock.invocationCallOrder[0]).toBeLessThan(
      transactionManager.query.mock.invocationCallOrder[0],
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects a rejected status without a structured reason before writing', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          status: ApplicationStatus.PENDIENTE,
          pipelineStageId: 'pending-stage',
        })
        .mockResolvedValueOnce({
          id: 'rejected-stage',
          jobId: 'job-id',
          statusProjection: ApplicationStatus.RECHAZADO,
          isArchived: false,
        })
        .mockResolvedValueOnce({ id: 'pending-stage', name: 'Pendiente' }),
      update: jest.fn(),
      insert: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) => {
          return await operation(manager);
        },
      ),
    };
    const repository = new ApplicationRepositoryImpl(
      { findOne: jest.fn() } as never,
      dataSource as never,
    );

    await expect(
      repository.update({
        id: 'application-id',
        status: ApplicationStatus.RECHAZADO,
        changedById: 'recruiter-id',
        rejectionNote: null,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('rejects the transaction when a status notification intent cannot be saved', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          candidateId: 'candidate-id',
          status: ApplicationStatus.PENDIENTE,
          pipelineStageId: 'pending-stage',
        })
        .mockResolvedValueOnce({
          id: 'interview-stage',
          jobId: 'job-id',
          name: 'Entrevista',
          statusProjection: ApplicationStatus.ENTREVISTA,
          isArchived: false,
        })
        .mockResolvedValueOnce({
          id: 'pending-stage',
          name: 'Pendiente',
        })
        .mockResolvedValueOnce({ id: 'job-id', title: 'Lab role' }),
      update: jest.fn().mockResolvedValue(undefined),
      insert: jest.fn().mockResolvedValue(undefined),
      query: jest.fn().mockRejectedValue(new Error('intent insert failed')),
    };
    const dataSource = {
      transaction: jest.fn((operation: (value: typeof manager) => unknown) =>
        operation(manager),
      ),
    };
    const repository = new ApplicationRepositoryImpl(
      { findOne: jest.fn() } as never,
      dataSource as never,
    );

    await expect(
      repository.update({
        id: 'application-id',
        status: ApplicationStatus.ENTREVISTA,
        changedById: 'recruiter-id',
        rejectionNote: null,
      }),
    ).rejects.toThrow('intent insert failed');

    expect(manager.update).toHaveBeenCalledTimes(1);
    expect(manager.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        applicationId: 'application-id',
        newStatus: ApplicationStatus.ENTREVISTA,
      }),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO application_status_notification_intent',
      ),
      expect.any(Array),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it.each([
    { organizationId: 'other-organization-id', active: true },
    { organizationId: 'organization-id', active: false },
  ])(
    'rejects an inactive or cross-organization reason before writing',
    async ({ organizationId, active }) => {
      const manager = {
        findOne: jest
          .fn()
          .mockResolvedValueOnce({
            id: 'application-id',
            jobId: 'job-id',
            status: ApplicationStatus.PENDIENTE,
            pipelineStageId: 'pending-stage',
          })
          .mockResolvedValueOnce({
            id: 'rejected-stage',
            jobId: 'job-id',
            statusProjection: ApplicationStatus.RECHAZADO,
            isArchived: false,
          })
          .mockResolvedValueOnce({ id: 'pending-stage', name: 'Pendiente' })
          .mockResolvedValueOnce({
            id: 'job-id',
            organizationId: 'organization-id',
          })
          .mockResolvedValueOnce(
            organizationId === 'organization-id' && active
              ? {
                  id: 'reason-id',
                  organizationId,
                  active,
                  label: 'Experiencia',
                }
              : null,
          ),
        update: jest.fn(),
        insert: jest.fn(),
      };
      const dataSource = {
        transaction: jest.fn(
          async (operation: (value: typeof manager) => unknown) => {
            return await operation(manager);
          },
        ),
      };
      const repository = new ApplicationRepositoryImpl(
        { findOne: jest.fn() } as never,
        dataSource as never,
      );

      await expect(
        repository.update({
          id: 'application-id',
          status: ApplicationStatus.RECHAZADO,
          changedById: 'recruiter-id',
          rejectionNote: null,
          rejectionReasonId: 'reason-id',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(manager.findOne).toHaveBeenLastCalledWith(
        expect.anything(),
        expect.objectContaining({
          where: {
            id: 'reason-id',
            organizationId: 'organization-id',
            active: true,
          },
        }),
      );
      expect(manager.update).not.toHaveBeenCalled();
      expect(manager.insert).not.toHaveBeenCalled();
    },
  );
});

describe('ApplicationRepositoryImpl terminal transitions', () => {
  it('requires the explicit reopen operation to leave a closed application', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          candidateId: 'candidate-id',
          status: ApplicationStatus.RECHAZADO,
          pipelineStageId: 'rejected-stage',
        })
        .mockResolvedValueOnce({
          id: 'interview-stage',
          jobId: 'job-id',
          name: 'Entrevista técnica',
          statusProjection: ApplicationStatus.ENTREVISTA,
          isArchived: false,
        })
        .mockResolvedValueOnce({
          id: 'rejected-stage',
          jobId: 'job-id',
          name: 'Rechazada',
        }),
      update: jest.fn(),
      insert: jest.fn(),
      query: jest.fn(),
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
        stageId: 'interview-stage',
        changedById: 'recruiter-id',
        rejectionNote: null,
      }),
    ).rejects.toThrow('A closed application must be reopened with a reason');
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
  });

  it('reopens into an active stage and stores the actor and reason in history', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          candidateId: 'candidate-id',
          status: ApplicationStatus.RECHAZADO,
          pipelineStageId: 'rejected-stage',
        })
        .mockResolvedValueOnce({
          id: 'interview-stage',
          jobId: 'job-id',
          name: 'Entrevista técnica',
          statusProjection: ApplicationStatus.ENTREVISTA,
          isArchived: false,
        })
        .mockResolvedValueOnce({
          id: 'rejected-stage',
          jobId: 'job-id',
          name: 'Rechazada',
        })
        .mockResolvedValueOnce({ id: 'job-id', title: 'Researcher' }),
      update: jest.fn(),
      insert: jest.fn(),
      query: jest.fn(),
    };
    const dataSource = {
      transaction: jest.fn(
        async (operation: (value: typeof manager) => unknown) =>
          operation(manager),
      ),
    };
    const applicationRepository = {
      findOne: jest.fn().mockResolvedValue({
        id: 'application-id',
        jobId: 'job-id',
        candidateId: 'candidate-id',
        status: ApplicationStatus.ENTREVISTA,
      }),
    };
    const repository = new ApplicationRepositoryImpl(
      applicationRepository as never,
      dataSource as never,
    );

    await repository.reopen({
      id: 'application-id',
      stageId: 'interview-stage',
      changedById: 'recruiter-id',
      reason: 'La persona envió la certificación que faltaba',
    });

    expect(manager.update).toHaveBeenCalledWith(
      expect.anything(),
      'application-id',
      expect.objectContaining({ status: ApplicationStatus.ENTREVISTA }),
    );
    expect(manager.insert).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        previousStatus: ApplicationStatus.RECHAZADO,
        newStatus: ApplicationStatus.ENTREVISTA,
        changedById: 'recruiter-id',
        transitionKind: 'reopen',
        transitionNote: 'La persona envió la certificación que faltaba',
      }),
    );
    expect(manager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO application_status_notification_intent',
      ),
      expect.any(Array),
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('rejects reopening into the same terminal stage', async () => {
    const manager = {
      findOne: jest
        .fn()
        .mockResolvedValueOnce({
          id: 'application-id',
          jobId: 'job-id',
          candidateId: 'candidate-id',
          status: ApplicationStatus.RECHAZADO,
          pipelineStageId: 'rejected-stage',
        })
        .mockResolvedValueOnce({
          id: 'rejected-stage',
          jobId: 'job-id',
          name: 'Rechazada',
          statusProjection: ApplicationStatus.RECHAZADO,
          isArchived: false,
        })
        .mockResolvedValueOnce({
          id: 'rejected-stage',
          jobId: 'job-id',
          name: 'Rechazada',
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
      repository.reopen({
        id: 'application-id',
        stageId: 'rejected-stage',
        changedById: 'recruiter-id',
        reason: 'Se revisará de nuevo',
      }),
    ).rejects.toThrow('Reopen the application into an active stage');
    expect(manager.update).not.toHaveBeenCalled();
    expect(manager.insert).not.toHaveBeenCalled();
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
        async (operation: (value: typeof manager) => unknown) => {
          return await operation(manager);
        },
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
        async (operation: (value: typeof manager) => unknown) => {
          return await operation(manager);
        },
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
        async (operation: (value: typeof manager) => unknown) => {
          return await operation(manager);
        },
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

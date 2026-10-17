import { ApplicationController } from './application.controller';
import { ApplicationService } from '../../../core/services/application.service';
import { Application } from '../../../core/domain/entities/application.entity';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { ApplicationQueryDto } from '../../dtos/application/application-query.dto';
import { ApplicationStatusUpdateDto } from '../../dtos/application/application-status.dto';
import { ApplicationStatus } from '../../../core/domain/enums';
import { ApplicationHiringPlanDto } from '../../dtos/application/application-hiring-plan.dto';
import { ForbiddenException } from '@nestjs/common';

describe('Application detail access', () => {
  it('rejects unauthenticated reads before loading an application', async () => {
    const getApplicationById = jest.fn();
    const controller = new ApplicationController(
      { getApplicationById } as unknown as ApplicationService,
      {} as OrganizationAccessService,
    );

    await expect(
      controller.getApplicationById('application-id', undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getApplicationById).not.toHaveBeenCalled();
  });

  it('checks organization access before returning a recruiter read', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const requester = {
      id: 'member-id',
      email: 'member@example.invalid',
      type: 'organization',
      organizationId: 'organization-id',
    };
    const application = Object.assign(
      new Application(id, 'job-id', 'candidate-id'),
      {
        job: { id: 'job-id', title: 'Job', organizationId: 'organization-id' },
      },
    );
    const getApplicationById = jest.fn().mockResolvedValue(application);
    const assertApplicationAccess = jest.fn().mockResolvedValue(undefined);
    const controller = new ApplicationController(
      { getApplicationById } as unknown as ApplicationService,
      {
        assertApplicationAccess,
        hasAccess: jest.fn().mockResolvedValue(true),
      } as unknown as OrganizationAccessService,
    );

    await controller.getApplicationById(id, requester);

    expect(assertApplicationAccess).toHaveBeenCalledWith(id, requester, 'read');
  });

  it('does not return a recruiter read when organization access is denied', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const requester = {
      id: 'member-id',
      email: 'member@example.invalid',
      type: 'organization',
      organizationId: 'other-organization-id',
    };
    const application = Object.assign(
      new Application(id, 'job-id', 'candidate-id'),
      {
        job: { id: 'job-id', title: 'Job', organizationId: 'organization-id' },
      },
    );
    const getApplicationById = jest.fn().mockResolvedValue(application);
    const assertApplicationAccess = jest
      .fn()
      .mockRejectedValue(new ForbiddenException());
    const controller = new ApplicationController(
      { getApplicationById } as unknown as ApplicationService,
      {
        assertApplicationAccess,
        hasAccess: jest.fn().mockResolvedValue(false),
      } as unknown as OrganizationAccessService,
    );

    await expect(
      controller.getApplicationById(id, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(assertApplicationAccess).toHaveBeenCalledWith(id, requester, 'read');
  });
});

describe('Application list and delete access', () => {
  it('rejects an unauthenticated list before loading applications', async () => {
    const getApplicationsByJobId = jest.fn();
    const controller = new ApplicationController(
      { getApplicationsByJobId } as unknown as ApplicationService,
      {} as OrganizationAccessService,
    );

    await expect(
      controller.getAllApplications(
        { jobId: 'job-id' } as ApplicationQueryDto,
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getApplicationsByJobId).not.toHaveBeenCalled();
  });

  it('checks job access before returning the application list', async () => {
    const requester = {
      id: 'recruiter-id',
      email: 'recruiter@example.invalid',
      type: 'organization',
      organizationId: 'organization-id',
    };
    const getApplicationsByJobId = jest.fn();
    const assertJobAccess = jest
      .fn()
      .mockRejectedValue(new ForbiddenException());
    const controller = new ApplicationController(
      { getApplicationsByJobId } as unknown as ApplicationService,
      { assertJobAccess } as unknown as OrganizationAccessService,
    );

    await expect(
      controller.getAllApplications(
        { jobId: 'job-id' } as ApplicationQueryDto,
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(assertJobAccess).toHaveBeenCalledWith('job-id', requester, 'read');
    expect(getApplicationsByJobId).not.toHaveBeenCalled();
  });

  it('rejects an unauthenticated delete before loading an application', async () => {
    const getApplicationById = jest.fn();
    const deleteApplication = jest.fn();
    const controller = new ApplicationController(
      {
        getApplicationById,
        deleteApplication,
      } as unknown as ApplicationService,
      {} as OrganizationAccessService,
    );

    await expect(
      controller.deleteApplication('application-id', undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getApplicationById).not.toHaveBeenCalled();
    expect(deleteApplication).not.toHaveBeenCalled();
  });

  it('rejects a delete when the requester does not own the application', async () => {
    const requester = {
      id: 'other-candidate-id',
      email: 'candidate@example.invalid',
      type: 'professional',
      organizationId: null,
    };
    const getApplicationById = jest
      .fn()
      .mockResolvedValue(
        new Application('application-id', 'job-id', 'owner-id'),
      );
    const deleteApplication = jest.fn();
    const controller = new ApplicationController(
      {
        getApplicationById,
        deleteApplication,
      } as unknown as ApplicationService,
      {} as OrganizationAccessService,
    );

    await expect(
      controller.deleteApplication('application-id', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(getApplicationById).toHaveBeenCalledWith('application-id');
    expect(deleteApplication).not.toHaveBeenCalled();
  });
});

describe('Application contact access', () => {
  const application = Object.assign(
    new Application('app', 'job', 'candidate'),
    {
      resumeUrl: '/api/cv/signed-url?path=private',
      pipelineStageId: 'internal-stage-id',
      assigneeId: 'recruiter-id',
      nextAction: 'Call candidate',
      targetDate: '2026-11-30',
      coverLetter: 'Private contact text',
      candidate: {
        id: 'candidate',
        name: 'Candidate',
        email: 'private@example.invalid',
      },
      job: { id: 'job', title: 'Job', organizationId: 'organization' },
    },
  );
  const requester = {
    id: 'member',
    email: 'member@example.invalid',
    type: 'organization',
    organizationId: 'organization',
  };
  const run = async (canRecruit: boolean) => {
    const controller = new ApplicationController(
      {
        getApplicationsByJobId: jest
          .fn()
          .mockResolvedValue({ data: [application], total: 1 }),
      } as unknown as ApplicationService,
      {
        assertJobAccess: jest.fn(),
        hasAccess: jest.fn().mockResolvedValue(canRecruit),
      } as unknown as OrganizationAccessService,
    );
    return controller.getApplicationsByJob(
      'job',
      {} as ApplicationQueryDto,
      requester,
    );
  };
  it('keeps a viewer list without candidate contact, CV, or free text', async () => {
    const result = await run(false);
    expect(result.data[0].candidate?.name).toBe('Candidate');
    expect(result.data[0].candidate?.email).toBeUndefined();
    expect(result.data[0].resumeUrl).toBeUndefined();
    expect(result.data[0].coverLetter).toBeUndefined();
    expect(result.data[0].pipelineStageId).toBeUndefined();
    expect(result.data[0].assigneeId).toBeUndefined();
    expect(result.data[0].nextAction).toBeUndefined();
    expect(result.data[0].targetDate).toBeUndefined();
  });
  it('keeps full candidate data for an authorized recruiter', async () => {
    const result = await run(true);
    expect(result.data[0].candidate?.email).toBe('private@example.invalid');
    expect(result.data[0].resumeUrl).toBeDefined();
    expect(result.data[0].pipelineStageId).toBe('internal-stage-id');
    expect(result.data[0].assigneeId).toBe('recruiter-id');
    expect(result.data[0].nextAction).toBe('Call candidate');
    expect(result.data[0].targetDate).toBe('2026-11-30');
  });
});

describe('Application status history and rejection notes', () => {
  const applicationId = 'application-id';
  const requester = {
    id: 'recruiter-id',
    email: 'recruiter@example.invalid',
    type: 'organization',
    organizationId: 'organization-id',
  };

  it('passes an internal rejection note to the status transition', async () => {
    const updateApplicationStatus = jest
      .fn()
      .mockResolvedValue(
        new Application(applicationId, 'job-id', 'candidate-id'),
      );
    const controller = new ApplicationController(
      { updateApplicationStatus } as unknown as ApplicationService,
      {
        assertApplicationAccess: jest.fn(),
      } as unknown as OrganizationAccessService,
    );

    const dto: ApplicationStatusUpdateDto = {
      status: ApplicationStatus.RECHAZADO,
      rejectionNote: 'Experiencia insuficiente para este cargo',
    };
    await controller.updateApplicationStatus(applicationId, dto, requester);

    expect(updateApplicationStatus).toHaveBeenCalledWith({
      applicationId,
      status: ApplicationStatus.RECHAZADO,
      changedById: requester.id,
      rejectionNote: dto.rejectionNote,
    });
  });

  it('requires recruit access before returning status history', async () => {
    const assertApplicationAccess = jest.fn().mockResolvedValue(undefined);
    const getApplicationStatusHistory = jest.fn().mockResolvedValue([]);
    const controller = new ApplicationController(
      { getApplicationStatusHistory } as unknown as ApplicationService,
      { assertApplicationAccess } as unknown as OrganizationAccessService,
    );

    await controller.getApplicationStatusHistory(applicationId, requester);

    expect(assertApplicationAccess).toHaveBeenCalledWith(
      applicationId,
      requester,
      'recruit',
    );
    expect(getApplicationStatusHistory).toHaveBeenCalledWith(applicationId);
  });

  it('does not return status history when recruit access is denied', async () => {
    const assertApplicationAccess = jest
      .fn()
      .mockRejectedValue(new Error('Access denied'));
    const getApplicationStatusHistory = jest.fn().mockResolvedValue([]);
    const controller = new ApplicationController(
      { getApplicationStatusHistory } as unknown as ApplicationService,
      { assertApplicationAccess } as unknown as OrganizationAccessService,
    );

    await expect(
      controller.getApplicationStatusHistory(applicationId, requester),
    ).rejects.toThrow('Access denied');
    expect(getApplicationStatusHistory).not.toHaveBeenCalled();
  });
});

describe('Application reopening', () => {
  it('requires recruiter access and passes the actor, stage, and reason to the service', async () => {
    const applicationId = '11111111-1111-4111-8111-111111111111';
    const stageId = '22222222-2222-4222-8222-222222222222';
    const requester = {
      id: 'recruiter-id',
      email: 'recruiter@example.invalid',
      type: 'organization',
      organizationId: 'organization-id',
    };
    const application = new Application(
      applicationId,
      'job-id',
      'candidate-id',
    );
    const service = {
      reopenApplication: jest.fn().mockResolvedValue(application),
    };
    const organizationAccess = {
      assertApplicationAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new ApplicationController(
      service as unknown as ApplicationService,
      organizationAccess as unknown as OrganizationAccessService,
    );

    const result = await controller.reopenApplication(
      applicationId,
      { stageId, reason: 'La persona confirmó disponibilidad' },
      requester,
    );

    expect(organizationAccess.assertApplicationAccess).toHaveBeenCalledWith(
      applicationId,
      requester,
      'recruit',
    );
    expect(service.reopenApplication).toHaveBeenCalledWith({
      applicationId,
      stageId,
      changedById: requester.id,
      reason: 'La persona confirmó disponibilidad',
    });
    expect(result?.id).toBe(applicationId);
  });
});

describe('Application hiring plan permissions', () => {
  it('requires recruit access and updates the plan', async () => {
    const requester = {
      id: 'recruiter-id',
      email: 'recruiter@example.invalid',
      type: 'organization',
      organizationId: 'organization-id',
    };
    const assertApplicationAccess = jest.fn().mockResolvedValue(undefined);
    const updateHiringPlan = jest.fn().mockResolvedValue(
      Object.assign(
        new Application('application-id', 'job-id', 'candidate-id'),
        {
          assigneeId: 'recruiter-id',
          nextAction: 'Coordinate interview',
          targetDate: '2026-11-30',
        },
      ),
    );
    const controller = new ApplicationController(
      { updateHiringPlan } as unknown as ApplicationService,
      { assertApplicationAccess } as unknown as OrganizationAccessService,
    );
    const dto: ApplicationHiringPlanDto = {
      assigneeId: 'recruiter-id',
      nextAction: 'Coordinate interview',
      targetDate: '2026-11-30',
    };

    const result = await controller.updateHiringPlan(
      'application-id',
      dto,
      requester,
    );

    expect(assertApplicationAccess).toHaveBeenCalledWith(
      'application-id',
      requester,
      'recruit',
    );
    expect(updateHiringPlan).toHaveBeenCalledWith({
      applicationId: 'application-id',
      ...dto,
    });
    expect(result?.assigneeId).toBe('recruiter-id');
  });

  it('does not update the hiring plan when recruit access is denied', async () => {
    const requester = {
      id: 'recruiter-id',
      email: 'recruiter@example.invalid',
      type: 'organization',
      organizationId: 'organization-id',
    };
    const assertApplicationAccess = jest
      .fn()
      .mockRejectedValue(new Error('Access denied'));
    const updateHiringPlan = jest.fn();
    const controller = new ApplicationController(
      { updateHiringPlan } as unknown as ApplicationService,
      { assertApplicationAccess } as unknown as OrganizationAccessService,
    );

    await expect(
      controller.updateHiringPlan(
        'application-id',
        { assigneeId: 'recruiter-id' } as ApplicationHiringPlanDto,
        requester,
      ),
    ).rejects.toThrow('Access denied');
    expect(updateHiringPlan).not.toHaveBeenCalled();
  });
});

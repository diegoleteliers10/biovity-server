import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Job } from '../../../core/domain/entities/job.entity';
import { JobStatus } from '../../../core/domain/enums';
import { JobService } from '../../../core/services/job.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { JobController } from './job.controller';
import { JobQueryDto } from '../../dtos/job/job-query.dto';

describe('JobController public job access', () => {
  const jobService = {
    getAllJobs: jest.fn(),
    getJobByIdWithApplicationCount: jest.fn(),
  };
  const organizationAccess = {};
  const controller = new JobController(
    jobService as unknown as JobService,
    organizationAccess as unknown as OrganizationAccessService,
    {} as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('forces public search to active jobs when the request asks for drafts', async () => {
    jobService.getAllJobs.mockResolvedValue({
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    });
    const query = new JobQueryDto();
    query.status = 'draft';

    await controller.getAllJobs(query);

    expect(jobService.getAllJobs).toHaveBeenCalledWith(
      expect.objectContaining({ status: JobStatus.ACTIVE }),
      expect.objectContaining({ page: 1, limit: 10 }),
    );
  });

  it('does not expose a draft through public job detail', async () => {
    jobService.getJobByIdWithApplicationCount.mockResolvedValue({
      job: new Job('job-id', 'org-id', 'Draft', 'Description'),
      totalApplications: 0,
    });

    await expect(controller.getJobById('job-id')).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});

describe('JobController organization verification', () => {
  const requester = {
    id: 'user-id',
    email: 'member@example.com',
    type: 'organization' as const,
    organizationId: 'org-id',
  };

  it('blocks edits to an active job while the organization is unverified', async () => {
    const jobService = {
      getJobById: jest
        .fn()
        .mockResolvedValue(
          new Job(
            'job-id',
            'org-id',
            'Active role',
            'Description',
            null,
            null,
            [],
            new Date(),
            new Date(),
            {},
            JobStatus.ACTIVE,
          ),
        ),
      updateJob: jest
        .fn()
        .mockResolvedValue(
          new Job('job-id', 'org-id', 'Active role', 'Description'),
        ),
    };
    const organizationAccess = {
      assertJobAccess: jest.fn().mockResolvedValue(undefined),
      assertAccess: jest.fn().mockRejectedValue(new BadRequestException()),
    };
    const controller = new JobController(
      jobService as unknown as JobService,
      organizationAccess as unknown as OrganizationAccessService,
      {} as never,
    );

    await expect(
      controller.updateJob('job-id', { title: 'Changed role' }, requester),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'org-id',
      requester,
      'recruit',
    );
    expect(jobService.updateJob).not.toHaveBeenCalled();
  });

  it('keeps draft job edits available while the organization is unverified', async () => {
    const draft = new Job('job-id', 'org-id', 'Draft role', 'Description');
    const jobService = {
      getJobById: jest.fn().mockResolvedValue(draft),
      updateJob: jest.fn().mockResolvedValue(draft),
    };
    const organizationAccess = {
      assertJobAccess: jest.fn().mockResolvedValue(undefined),
      assertAccess: jest.fn().mockResolvedValue(undefined),
    };
    const controller = new JobController(
      jobService as unknown as JobService,
      organizationAccess as unknown as OrganizationAccessService,
      {} as never,
    );

    await controller.updateJob('job-id', { title: 'Changed role' }, requester);

    expect(organizationAccess.assertAccess).not.toHaveBeenCalled();
    expect(jobService.updateJob).toHaveBeenCalled();
  });

  it('allows an unverified organization to deactivate an active job', async () => {
    const active = new Job(
      'job-id',
      'org-id',
      'Active role',
      'Description',
      null,
      null,
      [],
      new Date(),
      new Date(),
      {},
      JobStatus.ACTIVE,
    );
    const draft = new Job('job-id', 'org-id', 'Active role', 'Description');
    const jobService = {
      getJobById: jest.fn().mockResolvedValue(active),
      updateJob: jest.fn().mockResolvedValue(draft),
    };
    const organizationAccess = {
      assertJobAccess: jest.fn().mockResolvedValue(undefined),
      assertAccess: jest.fn().mockRejectedValue(new BadRequestException()),
    };
    const controller = new JobController(
      jobService as unknown as JobService,
      organizationAccess as unknown as OrganizationAccessService,
      {} as never,
    );

    await expect(
      controller.updateJob('job-id', { status: JobStatus.DRAFT }, requester),
    ).resolves.toBeDefined();

    expect(organizationAccess.assertAccess).not.toHaveBeenCalled();
    expect(jobService.updateJob).toHaveBeenCalledWith(
      'job-id',
      expect.objectContaining({ status: JobStatus.DRAFT }),
    );
  });
});

describe('JobController distribution sources', () => {
  const requester = {
    id: 'member-id',
    email: 'member@example.com',
    type: 'organization' as const,
    organizationId: 'organization-id',
  };

  it('checks recruitment access for channel link management and read access for listing', async () => {
    const assertJobAccess = jest.fn().mockResolvedValue(undefined);
    const sources = {
      create: jest.fn().mockResolvedValue({ id: 'source-id' }),
      list: jest.fn().mockResolvedValue([]),
      disable: jest.fn().mockResolvedValue(true),
    };
    const controller = new JobController(
      {} as never,
      { assertJobAccess } as never,
      sources as never,
    );

    await controller.createDistributionSource(
      'job-id',
      { sourceChannel: 'linkedin' },
      requester,
    );
    await controller.getDistributionSources('job-id', requester);
    await controller.disableDistributionSource(
      'job-id',
      'source-id',
      requester,
    );

    expect(assertJobAccess.mock.calls).toEqual([
      ['job-id', requester, 'recruit'],
      ['job-id', requester, 'read'],
      ['job-id', requester, 'recruit'],
    ]);
    expect(sources.create).toHaveBeenCalledWith('job-id', 'linkedin');
    expect(sources.disable).toHaveBeenCalledWith('job-id', 'source-id');
  });
});

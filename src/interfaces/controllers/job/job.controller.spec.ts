import { NotFoundException } from '@nestjs/common';
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

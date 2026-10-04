import { ConflictException } from '@nestjs/common';
import type { IJobRepository } from '../repositories/job.repository';
import type { IOrganizationRepository } from '../repositories/organization.repository';
import { JobService } from './job.service';

describe('JobService.deleteJob', () => {
  const jobRepository = {
    findById: jest.fn(),
    countApplications: jest.fn(),
    delete: jest.fn(),
  };
  const organizationRepository = {};
  const service = new JobService(
    jobRepository as unknown as IJobRepository,
    organizationRepository as unknown as IOrganizationRepository,
  );

  beforeEach(() => jest.clearAllMocks());

  it('preserves a job with applications', async () => {
    jobRepository.findById.mockResolvedValue({ id: 'job-1' });
    jobRepository.countApplications.mockResolvedValue(1);

    await expect(service.deleteJob('job-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(jobRepository.delete).not.toHaveBeenCalled();
  });

  it('deletes a job without applications', async () => {
    jobRepository.findById.mockResolvedValue({ id: 'job-1' });
    jobRepository.countApplications.mockResolvedValue(0);
    jobRepository.delete.mockResolvedValue(true);

    await expect(service.deleteJob('job-1')).resolves.toBe(true);
    expect(jobRepository.delete).toHaveBeenCalledWith('job-1');
  });
});

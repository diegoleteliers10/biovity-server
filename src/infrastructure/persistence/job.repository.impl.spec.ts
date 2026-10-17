import type { Repository, SelectQueryBuilder } from 'typeorm';
import { JobStatus } from '../../core/domain/enums';
import { JobEntity } from '../database/orm/job.entity';
import { ApplicationEntity } from '../database/orm/application.entity';
import { JobRepositoryImpl } from './job.repository.impl';

function makeJob(id: string): JobEntity {
  return Object.assign(new JobEntity(), {
    id,
    organizationId: 'verified-organization-id',
    title: 'Backend Engineer',
    description: 'Build services',
    employmentType: null,
    experienceLevel: null,
    benefits: [],
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    salary: {},
    status: JobStatus.ACTIVE,
    views: 0,
    location: {},
    requiredSkills: [],
  });
}

describe('JobRepositoryImpl public results', () => {
  it('filters public jobs to verified organizations and returns verified jobs', async () => {
    const verifiedJob = makeJob('verified-job-id');
    const queryBuilder = {
      leftJoinAndSelect: jest.fn(),
      andWhere: jest.fn(),
      getCount: jest.fn().mockResolvedValue(1),
      skip: jest.fn(),
      take: jest.fn(),
      orderBy: jest.fn(),
      getMany: jest.fn().mockResolvedValue([verifiedJob]),
    };
    queryBuilder.leftJoinAndSelect.mockReturnValue(queryBuilder);
    queryBuilder.andWhere.mockReturnValue(queryBuilder);
    queryBuilder.skip.mockReturnValue(queryBuilder);
    queryBuilder.take.mockReturnValue(queryBuilder);
    queryBuilder.orderBy.mockReturnValue(queryBuilder);

    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<JobEntity>;
    const applicationRepository = {} as Repository<ApplicationEntity>;
    const jobs = new JobRepositoryImpl(repository, applicationRepository);

    await expect(
      jobs.findAll({ publicOnly: true, status: 'active' }),
    ).resolves.toMatchObject({
      data: [{ id: 'verified-job-id', status: JobStatus.ACTIVE }],
      total: 1,
    });

    expect(queryBuilder.andWhere).toHaveBeenCalledWith(
      "organization.verification_status = 'verified'",
    );
  });
});

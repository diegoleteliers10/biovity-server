import {
  IJobRepository,
  JobFilters,
  PaginationOptions,
  PaginatedResult,
  JobWithApplications,
} from '../../core/repositories/job.repository';
import { Injectable } from '@nestjs/common';
import { JobEntity, ApplicationEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../core/domain/entities/job.entity';
import { JobDomainOrmMapper } from '../../shared/mappers/job/jobDomain-orm.mapper';

@Injectable()
export class JobRepositoryImpl implements IJobRepository {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
  ) {}

  async create(entity: Job): Promise<Job> {
    const jobOrm = JobDomainOrmMapper.toOrm(entity);
    const savedJob = await this.jobRepository.save(jobOrm);
    return JobDomainOrmMapper.toDomain(savedJob);
  }

  async findById(id: string): Promise<Job | null> {
    const jobOrm = await this.jobRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    return jobOrm ? JobDomainOrmMapper.toDomain(jobOrm) : null;
  }

  async findAll(
    filters?: JobFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Job>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.organization', 'organization');

    if (filters?.status) {
      queryBuilder.andWhere('job.status = :status', { status: filters.status });
    }

    if (filters?.organizationId) {
      queryBuilder.andWhere('job.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(job.title ILIKE :search OR job.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit).orderBy('job.createdAt', 'DESC');

    const jobsOrm = await queryBuilder.getMany();
    const data = jobsOrm.map(jobOrm => JobDomainOrmMapper.toDomain(jobOrm));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByOrganizationId(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Job>> {
    return this.findAll({ organizationId }, pagination);
  }

  async findByIdWithApplications(
    id: string,
  ): Promise<JobWithApplications | null> {
    const job = await this.findById(id);
    if (!job) return null;

    const applicationsCount = await this.applicationRepository.count({
      where: { jobId: id },
    });

    return {
      job,
      applicationsCount,
    };
  }

  async findAllWithApplicationCounts(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<JobWithApplications>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.jobRepository
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('job.organizationId = :organizationId', { organizationId });

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit).orderBy('job.createdAt', 'DESC');

    const jobsOrm = await queryBuilder.getMany();

    // Get application counts for each job
    const jobsWithCounts: JobWithApplications[] = await Promise.all(
      jobsOrm.map(async jobOrm => {
        const applicationsCount = await this.applicationRepository.count({
          where: { jobId: jobOrm.id },
        });
        return {
          job: JobDomainOrmMapper.toDomain(jobOrm),
          applicationsCount,
        };
      }),
    );

    return {
      data: jobsWithCounts,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, entity: Partial<Job>): Promise<Job | null> {
    const existingJob = await this.jobRepository.findOne({ where: { id } });
    if (!existingJob) return null;

    const updatedJobOrm = {
      ...existingJob,
      ...JobDomainOrmMapper.toOrm(entity as Job),
    };
    const savedJob = await this.jobRepository.save(updatedJobOrm);
    return JobDomainOrmMapper.toDomain(savedJob);
  }

  async incrementViews(id: string): Promise<Job | null> {
    await this.jobRepository.increment({ id }, 'views', 1);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.jobRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

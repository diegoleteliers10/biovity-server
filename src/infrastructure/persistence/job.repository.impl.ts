import { IJobRepository } from '../../core/repositories/job.repository';
import { Injectable } from '@nestjs/common';
import { JobEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from '../../core/domain/entities/job.entity';
import { JobDomainOrmMapper } from '../../shared/mappers/job/jobDomain-orm.mapper';

@Injectable()
export class JobRepositoryImpl implements IJobRepository {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
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

  async findAll(): Promise<Job[]> {
    const jobsOrm = await this.jobRepository.find({
      relations: ['organization'],
    });
    return jobsOrm.map(jobOrm => JobDomainOrmMapper.toDomain(jobOrm));
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

  async delete(id: string): Promise<boolean> {
    const result = await this.jobRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

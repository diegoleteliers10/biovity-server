import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IJobRepository } from '../../core/repositories/job.repository';
import { Job } from '../../core/domain/entities/job.entity';
import { JobEntity } from '../database/orm/job.entity';
import { JobMapper } from '../../shared/mappers/job.mapper';

@Injectable()
export class JobRepositoryImpl implements IJobRepository {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
  ) {}

  async create(entity: Job): Promise<Job> {
    const jobEntity = JobMapper.toEntity(entity);
    const savedEntity = await this.jobRepository.save(jobEntity);
    return JobMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Job | null> {
    const jobEntity = await this.jobRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    return jobEntity ? JobMapper.toDomain(jobEntity) : null;
  }

  async findAll(): Promise<Job[]> {
    const jobEntities = await this.jobRepository.find({
      relations: ['organization'],
    });
    return jobEntities.map(entity => JobMapper.toDomain(entity));
  }

  async update(id: string, entity: Partial<Job>): Promise<Job | null> {
    const existingEntity = await this.jobRepository.findOne({
      where: { id },
    });

    if (!existingEntity) {
      return null;
    }

    const updatedEntity = { ...existingEntity, ...entity };
    const savedEntity = await this.jobRepository.save(updatedEntity);
    return JobMapper.toDomain(savedEntity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.jobRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}

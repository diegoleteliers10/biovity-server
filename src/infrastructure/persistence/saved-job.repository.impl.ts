import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedJobEntity } from '../database/orm/saved-job.entity';
import { SavedJob } from '../../core/domain/entities/saved-job.entity';
import { SavedJobDomainOrmMapper } from '../../shared/mappers/saved-job/savedJobDomain-orm.mapper';
import {
  ISavedJobRepository,
  SavedJobFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../core/repositories/saved-job.repository';

@Injectable()
export class SavedJobRepositoryImpl implements ISavedJobRepository {
  constructor(
    @InjectRepository(SavedJobEntity)
    private readonly savedJobRepository: Repository<SavedJobEntity>,
  ) {}

  async create(entity: SavedJob): Promise<SavedJob> {
    const savedJobOrm = SavedJobDomainOrmMapper.toOrm(entity);
    const savedJob = await this.savedJobRepository.save(savedJobOrm);
    return SavedJobDomainOrmMapper.toDomain(savedJob);
  }

  async findById(id: string): Promise<SavedJob | null> {
    const savedJobOrm = await this.savedJobRepository.findOne({
      where: { id },
      relations: ['job', 'user'],
    });
    return savedJobOrm ? SavedJobDomainOrmMapper.toDomain(savedJobOrm) : null;
  }

  async findByUserAndJob(userId: string, jobId: string): Promise<SavedJob | null> {
    const savedJobOrm = await this.savedJobRepository.findOne({
      where: { userId, jobId },
      relations: ['job', 'user'],
    });
    return savedJobOrm ? SavedJobDomainOrmMapper.toDomain(savedJobOrm) : null;
  }

  async findByUserId(
    userId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<SavedJob>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.savedJobRepository
      .createQueryBuilder('savedJob')
      .leftJoinAndSelect('savedJob.job', 'job')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('savedJob.userId = :userId', { userId });

    const total = await queryBuilder.getCount();

    const savedJobsOrm = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('savedJob.createdAt', 'DESC')
      .getMany();

    const data = savedJobsOrm.map((savedJob) =>
      SavedJobDomainOrmMapper.toDomain(savedJob),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findByJobId(
    jobId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<SavedJob>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.savedJobRepository
      .createQueryBuilder('savedJob')
      .leftJoinAndSelect('savedJob.user', 'user')
      .where('savedJob.jobId = :jobId', { jobId });

    const total = await queryBuilder.getCount();

    const savedJobsOrm = await queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('savedJob.createdAt', 'DESC')
      .getMany();

    const data = savedJobsOrm.map((savedJob) =>
      SavedJobDomainOrmMapper.toDomain(savedJob),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.savedJobRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }

  async deleteByUserAndJob(userId: string, jobId: string): Promise<boolean> {
    const result = await this.savedJobRepository.delete({ userId, jobId });
    return result.affected != null && result.affected > 0;
  }
}

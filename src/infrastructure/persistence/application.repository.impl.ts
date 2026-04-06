import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationEntity } from '../database/orm';
import { Application } from '../../core/domain/entities/application.entity';
import { ApplicationDomainOrmMapper } from '../../shared/mappers/application/applicationDomain-orm.mapper';
import {
  IApplicationRepository,
  ApplicationFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../core/repositories/application.respository';

@Injectable()
export class ApplicationRepositoryImpl implements IApplicationRepository {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
  ) {}

  async create(entity: Application): Promise<Application> {
    const applicationOrm = ApplicationDomainOrmMapper.toOrm(entity);
    const savedApplication =
      await this.applicationRepository.save(applicationOrm);
    return ApplicationDomainOrmMapper.toDomain(savedApplication);
  }

  async findById(id: string): Promise<Application | null> {
    const applicationOrm = await this.applicationRepository.findOne({
      where: { id },
      relations: ['job', 'candidate'],
    });
    return applicationOrm
      ? ApplicationDomainOrmMapper.toDomain(applicationOrm)
      : null;
  }

  async findByJobAndCandidate(
    jobId: string,
    candidateId: string,
  ): Promise<Application | null> {
    const applicationOrm = await this.applicationRepository.findOne({
      where: { jobId, candidateId },
      relations: ['job', 'candidate'],
    });
    return applicationOrm
      ? ApplicationDomainOrmMapper.toDomain(applicationOrm)
      : null;
  }

  async findAll(
    filters?: ApplicationFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFilters(filters, pagination);
  }

  async findByJobId(
    jobId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFilters({ jobId }, pagination);
  }

  async findByCandidateId(
    candidateId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFilters({ candidateId }, pagination);
  }

  async findByOrganizationId(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    return this.findByFiltersWithOrganization(organizationId, pagination);
  }

  private async findByFiltersWithOrganization(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.candidate', 'candidate')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('organization.id = :organizationId', { organizationId });

    const total = await queryBuilder.getCount();

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('application.createdAt', 'DESC');

    const applicationsOrm = await queryBuilder.getMany();
    const data = applicationsOrm.map(app =>
      ApplicationDomainOrmMapper.toDomain(app),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  private async findByFilters(
    filters?: ApplicationFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoinAndSelect('application.job', 'job')
      .leftJoinAndSelect('application.candidate', 'candidate');

    if (filters?.jobId) {
      queryBuilder.andWhere('application.jobId = :jobId', {
        jobId: filters.jobId,
      });
    }

    if (filters?.candidateId) {
      queryBuilder.andWhere('application.candidateId = :candidateId', {
        candidateId: filters.candidateId,
      });
    }

    if (filters?.status) {
      queryBuilder.andWhere('application.status = :status', {
        status: filters.status,
      });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('application.createdAt', 'DESC');

    const applicationsOrm = await queryBuilder.getMany();
    const data = applicationsOrm.map(app =>
      ApplicationDomainOrmMapper.toDomain(app),
    );

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(
    id: string,
    entity: Partial<Application>,
  ): Promise<Application | null> {
    // Build update object with only defined values
    const updateData: Partial<ApplicationEntity> = {};

    if (entity.status !== undefined) {
      updateData.status = entity.status;
    }

    if (Object.keys(updateData).length === 0) {
      // No fields to update, return existing
      return this.findById(id);
    }

    const result = await this.applicationRepository.update(id, {
      ...updateData,
      updatedAt: new Date(),
    });

    if (result.affected === 0) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.applicationRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

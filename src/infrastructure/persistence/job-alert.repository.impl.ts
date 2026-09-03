import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JobAlertEntity } from '../database/orm/job-alert.entity';
import { JobAlert } from '../../core/domain/entities/job-alert.entity';
import { JobAlertDomainOrmMapper } from '../../shared/mappers/job-alert/jobAlertDomain-orm.mapper';
import { IJobAlertRepository } from '../../core/repositories/job-alert.repository';

@Injectable()
export class JobAlertRepositoryImpl implements IJobAlertRepository {
  constructor(
    @InjectRepository(JobAlertEntity)
    private readonly repository: Repository<JobAlertEntity>,
  ) {}

  async create(entity: JobAlert): Promise<JobAlert> {
    const orm = JobAlertDomainOrmMapper.toOrm(entity);
    const saved = await this.repository.save(orm);
    return JobAlertDomainOrmMapper.toDomain(saved);
  }

  async findById(id: string): Promise<JobAlert | null> {
    const orm = await this.repository.findOne({
      where: { id },
      relations: ['user'],
    });
    return orm ? JobAlertDomainOrmMapper.toDomain(orm) : null;
  }

  async findByUserId(userId: string): Promise<JobAlert[]> {
    const orms = await this.repository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    return orms.map(orm => JobAlertDomainOrmMapper.toDomain(orm));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

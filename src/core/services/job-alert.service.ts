import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IJobAlertRepository } from '../repositories/job-alert.repository';
import { JobAlert } from '../domain/entities/job-alert.entity';
import { JobAlertFrequency } from '../domain/enums';
import { CreateJobAlertInput } from '../../shared/mappers/job-alert/jobAlertDto-domain.mapper';

@Injectable()
export class JobAlertService {
  constructor(
    @Inject('IJobAlertRepository')
    private readonly repository: IJobAlertRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async create(data: CreateJobAlertInput): Promise<JobAlert> {
    const jobAlert = new JobAlert(
      this.generateId(),
      data.userId,
      data.keywords ?? null,
      data.location ?? null,
      data.category ?? null,
      data.frequency ?? JobAlertFrequency.INSTANTANEA,
      new Date(),
      new Date(),
    );
    return this.repository.create(jobAlert);
  }

  async getById(id: string): Promise<JobAlert | null> {
    return this.repository.findById(id);
  }

  async getByUserId(userId: string): Promise<JobAlert[]> {
    return this.repository.findByUserId(userId);
  }

  async delete(id: string, userId: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Job alert with id ${id} not found`);
    }
    if (existing.userId !== userId) {
      throw new NotFoundException(`Job alert with id ${id} not found`);
    }
    return this.repository.delete(id);
  }
}

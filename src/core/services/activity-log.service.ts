import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLogEntity } from '../../infrastructure/database/orm/activity-log.entity';

export interface CreateActivityLogInput {
  organizationId: string;
  userId: string;
  action: string;
  description: string;
  metadata?: Record<string, any>;
}

@Injectable()
export class ActivityLogService {
  constructor(
    @InjectRepository(ActivityLogEntity)
    private readonly repo: Repository<ActivityLogEntity>,
  ) {}

  async findByOrganization(organizationId: string): Promise<ActivityLogEntity[]> {
    return this.repo.find({
      where: { organizationId },
      relations: ['user'],
      order: { createdAt: 'DESC' },
      take: 100, // Limit to 100 logs for performance
    });
  }

  async log(input: CreateActivityLogInput): Promise<ActivityLogEntity> {
    const entity = this.repo.create({
      organizationId: input.organizationId,
      userId: input.userId,
      action: input.action,
      description: input.description,
      metadata: input.metadata || {},
    });
    return this.repo.save(entity);
  }
}

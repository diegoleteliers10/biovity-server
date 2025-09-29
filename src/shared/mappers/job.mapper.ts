import { Job } from '../../core/domain/entities/job.entity';
import { JobEntity } from '../../infrastructure/database/orm/job.entity';

export class JobMapper {
  static toDomain(entity: JobEntity): Job {
    return new Job(
      entity.id,
      entity.organizationId,
      entity.title,
      entity.description,
      entity.amount,
      entity.location,
      entity.employmentType,
      entity.experienceLevel,
      entity.benefits,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  static toEntity(domain: Job): JobEntity {
    const entity = new JobEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.title = domain.title;
    entity.description = domain.description;
    entity.amount = domain.amount;
    entity.location = domain.location;
    entity.employmentType = domain.employmentType;
    entity.experienceLevel = domain.experienceLevel;
    entity.benefits = domain.benefits;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}

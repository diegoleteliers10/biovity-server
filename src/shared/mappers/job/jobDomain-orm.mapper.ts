import { Job } from '../../../core/domain/entities/index';
import { JobEntity } from '../../../infrastructure/database/orm/index';

export class JobDomainOrmMapper {
  static toOrm(domain: Job): JobEntity {
    const jobOrm = new JobEntity();
    jobOrm.id = domain.id;
    jobOrm.title = domain.title;
    jobOrm.description = domain.description;
    jobOrm.amount = domain.amount;
    jobOrm.location = domain.location;
    jobOrm.employmentType = domain.employmentType;
    jobOrm.experienceLevel = domain.experienceLevel;
    jobOrm.benefits = domain.benefits;
    jobOrm.createdAt = domain.createdAt;
    jobOrm.updatedAt = domain.updatedAt;

    if (domain.organizationId) {
      jobOrm.organizationId = domain.organizationId;
    }

    return jobOrm;
  }

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
}

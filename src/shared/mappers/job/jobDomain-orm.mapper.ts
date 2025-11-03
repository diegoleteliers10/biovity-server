import { Job } from '../../../core/domain/entities/index';
import { JobEntity } from '../../../infrastructure/database/orm/index';

export class JobDomainOrmMapper {
  static toOrm(domain: Job): JobEntity {
    const jobOrm = new JobEntity();
    jobOrm.id = domain.id;
    jobOrm.organizationId = domain.organizationId;
    jobOrm.title = domain.title;
    jobOrm.description = domain.description;
    jobOrm.salary = domain.salary;
    jobOrm.location = domain.location;
    jobOrm.employmentType = domain.employmentType;
    jobOrm.experienceLevel = domain.experienceLevel;
    jobOrm.benefits = domain.benefits;
    jobOrm.status = domain.status;
    jobOrm.applicationsCount = domain.applicationsCount;
    jobOrm.expiresAt = domain.expiresAt;
    jobOrm.createdAt = domain.createdAt;
    jobOrm.updatedAt = domain.updatedAt;

    return jobOrm;
  }

  static toDomain(entity: JobEntity): Job {
    return new Job(
      entity.id,
      entity.organizationId,
      entity.title,
      entity.description,
      entity.salary,
      entity.location,
      entity.employmentType,
      entity.experienceLevel,
      entity.benefits,
      entity.status,
      entity.applicationsCount,
      entity.expiresAt,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

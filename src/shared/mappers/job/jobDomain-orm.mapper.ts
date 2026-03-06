import {
  Job,
  JobEmploymentType,
  JobExperienceLevel,
} from '../../../core/domain/entities/index';
import { JobEntity } from '../../../infrastructure/database/orm/index';

export class JobDomainOrmMapper {
  static toOrm(domain: Job): JobEntity {
    const jobOrm = new JobEntity();
    jobOrm.id = domain.id;
    jobOrm.organizationId = domain.organizationId;
    jobOrm.title = domain.title;
    jobOrm.description = domain.description;
    jobOrm.employmentType = domain.employmentType as JobEmploymentType;
    jobOrm.experienceLevel = domain.experienceLevel as JobExperienceLevel;
    jobOrm.benefits = domain.benefits;
    jobOrm.createdAt = domain.createdAt;
    jobOrm.updatedAt = domain.updatedAt;
    jobOrm.salary = domain.salary;
    jobOrm.status = domain.status;
    jobOrm.applicationsCount = domain.applicationsCount;
    jobOrm.expiresAt = domain.expiresAt;
    jobOrm.location = domain.location;

    return jobOrm;
  }

  static toDomain(entity: JobEntity): Job {
    return new Job(
      entity.id,
      entity.organizationId,
      entity.title,
      entity.description,
      entity.employmentType,
      entity.experienceLevel,
      entity.benefits,
      entity.createdAt,
      entity.updatedAt,
      entity.salary,
      entity.status,
      entity.applicationsCount,
      entity.expiresAt,
      entity.location,
    );
  }
}

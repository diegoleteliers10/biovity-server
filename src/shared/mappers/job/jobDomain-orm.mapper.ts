import { Job } from '../../../core/domain/entities/job.entity';
import { JobEntity } from '../../../infrastructure/database/orm/job.entity';

export class JobDomainOrmMapper {
  static toOrm(domain: Job): JobEntity {
    const jobOrm = new JobEntity();
    jobOrm.id = domain.id;
    jobOrm.organizationId = domain.organizationId;
    jobOrm.title = domain.title;
    jobOrm.description = domain.description;
    jobOrm.employmentType = domain.employmentType;
    jobOrm.experienceLevel = domain.experienceLevel;
    jobOrm.benefits = domain.benefits;
    jobOrm.createdAt = domain.createdAt;
    jobOrm.updatedAt = domain.updatedAt;
    jobOrm.salary = domain.salary;
    jobOrm.status = domain.status;
    jobOrm.views = domain.views;
    jobOrm.expiresAt = domain.expiresAt;
    jobOrm.location = domain.location;
    jobOrm.category = domain.category;
    jobOrm.requiredSkills = domain.requiredSkills;
    jobOrm.minExperience = domain.minExperience;

    return jobOrm;
  }

  static toDomain(entity: JobEntity): Job {
    const job = new Job(
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
      entity.views,
      entity.expiresAt,
      entity.location,
      entity.category,
      entity.requiredSkills,
      entity.minExperience,
    );

    // The ORM relation is a full OrganizationEntity; expose only the public
    // summary so secrets (integrations, phone, address) never leak into
    // job payloads.
    if (entity.organization) {
      job.organization = {
        id: entity.organization.id,
        name: entity.organization.name,
        slug: entity.organization.slug ?? undefined,
        logo: entity.organization.logo ?? undefined,
      };
    }

    return job;
  }
}

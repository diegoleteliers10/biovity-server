import { Job } from '../../../core/domain/entities/job.entity';
import { JobResponseDto, JobOrganizationDto } from '../../../interfaces/dtos/job/job-response.dto';

export class JobDomainDtoMapper {
  static toDto(domain: Job): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = domain.id;
    dto.organizationId = domain.organizationId;
    dto.title = domain.title;
    dto.description = domain.description;
    dto.salary = domain.salary;
    dto.location = domain.location;
    dto.employmentType = domain.employmentType ?? undefined;
    dto.experienceLevel = domain.experienceLevel ?? undefined;
    dto.benefits = domain.benefits;
    dto.status = domain.status;
    dto.views = domain.views;
    dto.expiresAt = domain.expiresAt;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    dto.category = domain.category;
    dto.requiredSkills = domain.requiredSkills;
    dto.minExperience = domain.minExperience;
    if (domain.organization) {
      dto.organization = new JobOrganizationDto();
      dto.organization.id = domain.organization.id;
      dto.organization.name = domain.organization.name;
      dto.organization.slug = domain.organization.slug;
      dto.organization.logo = domain.organization.logo;
    }
    return dto;
  }
}

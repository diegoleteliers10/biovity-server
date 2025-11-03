import { Job } from '../../../core/domain/entities/job.entity';
import { JobResponseDto } from '../../../interfaces/dtos/job/job-response.dto';

export class JobDomainDtoMapper {
  static toDto(domain: Job): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = domain.id;
    dto.organizationId = domain.organizationId;
    dto.title = domain.title;
    dto.description = domain.description;
    dto.salary = domain.salary;
    dto.location = domain.location;
    dto.employmentType = domain.employmentType;
    dto.experienceLevel = domain.experienceLevel;
    dto.benefits = domain.benefits;
    dto.status = domain.status;
    dto.applicationsCount = domain.applicationsCount;
    dto.expiresAt = domain.expiresAt;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
  }
}

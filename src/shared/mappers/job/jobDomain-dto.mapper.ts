import { Job } from '../../../core/domain/entities/job.entity';
import { JobResponseDto } from '../../../interfaces/dtos/job/job-response.dto';

export class JobDomainDtoMapper {
  static toDto(domain: Job): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = domain.id;
    dto.organizationId = domain.organizationId;
    dto.title = domain.title;
    dto.description = domain.description;
    dto.amount = domain.amount;
    dto.location = domain.location;
    dto.employmentType = domain.employmentType;
    dto.experienceLevel = domain.experienceLevel;
    dto.benefits = domain.benefits;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
  }
}

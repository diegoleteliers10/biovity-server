import { JobEntity } from '../../../infrastructure/database/orm/index';
import { JobResponseDto } from '../../../interfaces/dtos/job/job-response.dto';

export class JobOrmDtoMapper {
  static toDto(entity: JobEntity): JobResponseDto {
    const dto = new JobResponseDto();
    dto.id = entity.id;
    dto.organizationId = entity.organizationId;
    dto.title = entity.title;
    dto.description = entity.description;
    dto.amount = entity.amount;
    dto.location = entity.location;
    dto.employmentType = entity.employmentType;
    dto.experienceLevel = entity.experienceLevel;
    dto.benefits = entity.benefits;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

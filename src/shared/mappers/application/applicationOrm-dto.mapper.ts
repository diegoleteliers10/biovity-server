import { ApplicationEntity } from '../../../infrastructure/database/orm/index';
import { ApplicationResponseDto } from '../../../interfaces/dtos/application/application-response.dto';

export class ApplicationOrmDtoMapper {
  static toDto(entity: ApplicationEntity): ApplicationResponseDto {
    const dto = new ApplicationResponseDto();
    dto.id = entity.id;
    dto.jobId = entity.jobId;
    dto.candidateId = entity.candidateId;
    dto.status = entity.status;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

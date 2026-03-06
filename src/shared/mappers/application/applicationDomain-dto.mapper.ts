import { Application } from '../../../core/domain/entities/application.entity';
import { ApplicationResponseDto } from '../../../interfaces/dtos/application/application-response.dto';

export class ApplicationDomainDtoMapper {
  static toDto(domain: Application): ApplicationResponseDto {
    const dto = new ApplicationResponseDto();
    dto.id = domain.id;
    dto.jobId = domain.jobId;
    dto.candidateId = domain.candidateId;
    dto.status = domain.status;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
  }
}

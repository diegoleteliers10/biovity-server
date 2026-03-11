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

    // Map job relation if exists
    if ((domain as any).job) {
      dto.job = {
        id: (domain as any).job.id,
        title: (domain as any).job.title,
        organizationId: (domain as any).job.organizationId,
      };
    }

    // Map candidate relation if exists
    if ((domain as any).candidate) {
      dto.candidate = {
        id: (domain as any).candidate.id,
        name: (domain as any).candidate.name,
        email: (domain as any).candidate.email,
        avatar: (domain as any).candidate.avatar,
        profession: (domain as any).candidate.profession,
      };
    }

    return dto;
  }
}

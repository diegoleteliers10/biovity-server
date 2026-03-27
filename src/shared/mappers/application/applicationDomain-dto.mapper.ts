import { Application } from '../../../core/domain/entities/application.entity';
import { ApplicationResponseDto } from '../../../interfaces/dtos/application/application-response.dto';

interface JobRelation {
  id: string;
  title: string;
  organizationId: string;
}

interface CandidateRelation {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  profession?: string;
}

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
    const job = (domain as unknown as { job?: JobRelation }).job;
    if (job) {
      dto.job = {
        id: job.id,
        title: job.title,
        organizationId: job.organizationId,
      };
    }

    // Map candidate relation if exists
    const candidate = (domain as unknown as { candidate?: CandidateRelation })
      .candidate;
    if (candidate) {
      dto.candidate = {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        avatar: candidate.avatar,
        profession: candidate.profession,
      };
    }

    return dto;
  }
}

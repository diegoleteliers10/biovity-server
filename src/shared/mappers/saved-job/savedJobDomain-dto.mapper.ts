import { SavedJob } from '../../../core/domain/entities/saved-job.entity';
import { SavedJobResponseDto } from '../../../interfaces/dtos/saved-job/saved-job-response.dto';

export class SavedJobDomainDtoMapper {
  static toDto(domain: SavedJob): SavedJobResponseDto {
    const dto = new SavedJobResponseDto();
    dto.id = domain.id;
    dto.userId = domain.userId;
    dto.jobId = domain.jobId;
    dto.createdAt = domain.createdAt;

    // Map job relation if exists
    if ((domain as any).job) {
      dto.job = (domain as any).job;
    }

    return dto;
  }

  static toDtoList(domains: SavedJob[]): SavedJobResponseDto[] {
    return domains.map(domain => this.toDto(domain));
  }
}

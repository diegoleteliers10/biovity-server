import { JobAlert } from '../../../core/domain/entities/job-alert.entity';
import { JobAlertResponseDto } from '../../../interfaces/dtos/job-alert/job-alert-response.dto';

export class JobAlertDomainDtoMapper {
  static toDto(domain: JobAlert): JobAlertResponseDto {
    return {
      id: domain.id,
      userId: domain.userId,
      keywords: domain.keywords,
      location: domain.location,
      category: domain.category,
      frequency: domain.frequency,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}

import { JobAlertFrequency } from '../../../core/domain/enums';
import { CreateJobAlertDto } from '../../../interfaces/dtos/job-alert/create-job-alert.dto';

export interface CreateJobAlertInput {
  userId: string;
  keywords?: string;
  location?: string;
  category?: string;
  frequency?: JobAlertFrequency;
}

export class JobAlertDtoDomainMapper {
  static toCreateInput(dto: CreateJobAlertDto): CreateJobAlertInput {
    return {
      userId: dto.userId,
      keywords: dto.keywords,
      location: dto.location,
      category: dto.category,
      frequency: dto.frequency,
    };
  }
}

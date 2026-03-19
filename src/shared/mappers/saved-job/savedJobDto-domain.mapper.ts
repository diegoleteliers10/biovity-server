import { SavedJob } from '../../../core/domain/entities/saved-job.entity';
import { SavedJobCreateDto } from '../../../interfaces/dtos/saved-job/saved-job-create.dto';

export interface CreateSavedJobInput {
  userId: string;
  jobId: string;
}

export class SavedJobDtoDomainMapper {
  static toCreateSavedJobInput(dto: SavedJobCreateDto): CreateSavedJobInput {
    return {
      userId: dto.userId,
      jobId: dto.jobId,
    };
  }
}

import { CreatePipelineStageDto } from '../../../interfaces/dtos/pipeline-stage/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from '../../../interfaces/dtos/pipeline-stage/update-pipeline-stage.dto';

export interface CreatePipelineStageInput {
  jobId: string;
  name: string;
  order: number;
  color?: string;
}

export interface UpdatePipelineStageInput {
  name?: string;
  color?: string;
}

export class PipelineStageDtoDomainMapper {
  static toCreateInput(dto: CreatePipelineStageDto): CreatePipelineStageInput {
    return {
      jobId: dto.jobId,
      name: dto.name,
      order: dto.order ?? 0,
      color: dto.color,
    };
  }

  static toUpdateInput(dto: UpdatePipelineStageDto): UpdatePipelineStageInput {
    return {
      name: dto.name,
      color: dto.color,
    };
  }
}

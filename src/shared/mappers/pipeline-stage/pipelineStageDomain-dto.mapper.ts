import { PipelineStage } from '../../../core/domain/entities/pipeline-stage.entity';
import { PipelineStageResponseDto } from '../../../interfaces/dtos/pipeline-stage/pipeline-stage-response.dto';

export class PipelineStageDomainDtoMapper {
  static toDto(domain: PipelineStage): PipelineStageResponseDto {
    return {
      id: domain.id,
      jobId: domain.jobId,
      name: domain.name,
      order: domain.order,
      color: domain.color,
    };
  }
}

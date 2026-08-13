import { PipelineStage } from '../domain/entities/pipeline-stage.entity';

export interface IPipelineStageRepository {
  create(entity: PipelineStage): Promise<PipelineStage>;
  findById(id: string): Promise<PipelineStage | null>;
  findByJobId(jobId: string): Promise<PipelineStage[]>;
  update(
    id: string,
    entity: Partial<PipelineStage>,
  ): Promise<PipelineStage | null>;
  reorder(jobId: string, stageIds: string[]): Promise<PipelineStage[]>;
  delete(id: string): Promise<boolean>;
}

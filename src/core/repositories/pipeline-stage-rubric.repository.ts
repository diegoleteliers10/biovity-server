import type {
  InterviewRole,
  PipelineStageRubric,
  PipelineStageRubricCriterion,
} from '../domain/entities/pipeline-stage-rubric';

export interface IPipelineStageRubricRepository {
  findCurrent(stageId: string): Promise<PipelineStageRubric | null>;
  createVersion(
    stageId: string,
    roles: InterviewRole[],
    criteria: PipelineStageRubricCriterion[],
  ): Promise<PipelineStageRubric | null>;
}

export const PIPELINE_STAGE_RUBRIC_REPOSITORY =
  'IPipelineStageRubricRepository';

import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  InterviewRole,
  PipelineStageRubric,
  PipelineStageRubricCriterion,
} from '../../core/domain/entities/pipeline-stage-rubric';
import { GENERAL_INTERVIEW_ROLE } from '../../core/domain/entities/pipeline-stage-rubric';
import type { IPipelineStageRubricRepository } from '../../core/repositories/pipeline-stage-rubric.repository';

type RubricRow = {
  stage_id: string;
  current_version_id: string | null;
  version: number | null;
  criteria: PipelineStageRubricCriterion[] | null;
  roles: InterviewRole[] | null;
};

const normalizeCriteria = (
  criteria: PipelineStageRubricCriterion[] | null,
): PipelineStageRubricCriterion[] =>
  (criteria ?? []).map(criterion => ({ ...criterion, roleIds: criterion.roleIds ?? [] }));

@Injectable()
export class PipelineStageRubricRepositoryImpl implements IPipelineStageRubricRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findCurrent(stageId: string): Promise<PipelineStageRubric | null> {
    const rows = await this.dataSource.query<RubricRow[]>(
      `SELECT stage.id AS stage_id,
              rubric.id AS current_version_id,
              rubric.version,
              rubric.roles,
              rubric.criteria
       FROM pipeline_stage stage
       LEFT JOIN pipeline_stage_rubric_version rubric
         ON rubric.id = stage.current_rubric_version_id
       WHERE stage.id = $1::uuid`,
      [stageId],
    );
    const row = rows[0];
    return row
      ? {
          stage_id: row.stage_id,
          current_version_id: row.current_version_id,
          version: row.version ?? 0,
          roles: row.roles ?? [GENERAL_INTERVIEW_ROLE],
          criteria: normalizeCriteria(row.criteria),
        }
      : null;
  }

  async createVersion(
    stageId: string,
    roles: InterviewRole[],
    criteria: PipelineStageRubricCriterion[],
  ): Promise<PipelineStageRubric | null> {
    return this.dataSource.transaction(async manager => {
      const stages = await manager.query<Array<{ id: string }>>(
        'SELECT id FROM pipeline_stage WHERE id = $1::uuid AND is_archived = false FOR UPDATE',
        [stageId],
      );
      if (!stages[0]) return null;

      const versions = await manager.query<Array<{ version: number }>>(
        `SELECT COALESCE(MAX(version), 0) + 1 AS version
         FROM pipeline_stage_rubric_version
         WHERE pipeline_stage_id = $1::uuid`,
        [stageId],
      );
      const version = Number(versions[0]?.version ?? 1);
      const rows = await manager.query<RubricRow[]>(
        `INSERT INTO pipeline_stage_rubric_version
           (pipeline_stage_id, version, roles, criteria)
         VALUES ($1::uuid, $2, $3::jsonb, $4::jsonb)
         RETURNING pipeline_stage_id AS stage_id,
                   id AS current_version_id,
                   version,
                   roles,
                   criteria`,
        [stageId, version, JSON.stringify(roles), JSON.stringify(criteria)],
      );
      const row = rows[0];
      if (!row) return null;
      await manager.query(
        `UPDATE pipeline_stage
         SET current_rubric_version_id = $2::uuid
         WHERE id = $1::uuid`,
        [stageId, row.current_version_id],
      );
      return {
        stage_id: row.stage_id,
        current_version_id: row.current_version_id,
        version: Number(row.version),
        roles: row.roles ?? roles,
        criteria: normalizeCriteria(row.criteria ?? criteria),
      };
    });
  }
}

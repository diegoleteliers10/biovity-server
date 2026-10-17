import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import type {
  InterviewRole,
  PipelineStageRubric,
  PipelineStageRubricCriterion,
} from '../domain/entities/pipeline-stage-rubric';
import { GENERAL_INTERVIEW_ROLE } from '../domain/entities/pipeline-stage-rubric';
import {
  PIPELINE_STAGE_RUBRIC_REPOSITORY,
  type IPipelineStageRubricRepository,
} from '../repositories/pipeline-stage-rubric.repository';

@Injectable()
export class PipelineStageRubricService {
  constructor(
    @Inject(PIPELINE_STAGE_RUBRIC_REPOSITORY)
    private readonly rubrics: IPipelineStageRubricRepository,
  ) {}

  async findCurrent(stageId: string): Promise<PipelineStageRubric> {
    const rubric = await this.rubrics.findCurrent(stageId);
    if (!rubric) throw new NotFoundException('No existe la etapa solicitada.');
    return rubric;
  }

  async createVersion(
    stageId: string,
    input: {
      roles?: Array<{ id?: string; label: string }>;
      criteria: Array<{
        id?: string;
        label: string;
        description?: string;
        roleIds?: string[];
      }>;
    },
  ): Promise<PipelineStageRubric> {
    const inputRoles = input.roles ?? [];
    const roles: InterviewRole[] = [
      GENERAL_INTERVIEW_ROLE,
      ...inputRoles
        .filter(role => role.id !== GENERAL_INTERVIEW_ROLE.id)
        .map(role => ({ id: role.id ?? crypto.randomUUID(), label: role.label.trim() })),
    ];
    const criteria = input.criteria;
    const ids = criteria.flatMap(item => (item.id ? [item.id] : []));
    const labels = criteria.map(item => item.label.trim().toLowerCase());
    const roleIds = roles.map(role => role.id);
    const roleLabels = roles.map(role => role.label.toLowerCase());
    if (
      roles.length > 20 ||
      roles.some(role => role.label.length === 0 || role.label.length > 80) ||
      new Set(roleIds).size !== roleIds.length ||
      new Set(roleLabels).size !== roleLabels.length ||
      criteria.some(
        item =>
          item.label.trim().length === 0 ||
          item.label.trim().length > 120 ||
          (item.description?.trim().length ?? 0) > 500 ||
          new Set(item.roleIds ?? []).size !== (item.roleIds ?? []).length ||
          (item.roleIds ?? []).some(id => !roleIds.includes(id)),
      ) ||
      new Set(ids).size !== ids.length ||
      new Set(labels).size !== labels.length
    ) {
      return Promise.reject(new BadRequestException(
        'Cada criterio debe tener un nombre único.',
      ));
    }
    const normalized: PipelineStageRubricCriterion[] = criteria.map(item => ({
      id: item.id ?? crypto.randomUUID(),
      label: item.label.trim(),
      description: item.description?.trim() || null,
      roleIds: item.roleIds ?? [],
    }));
    const rubric = await this.rubrics.createVersion(stageId, roles, normalized);
    if (!rubric) {
      return Promise.reject(new NotFoundException('No existe la etapa solicitada.'));
    }
    return rubric;
  }
}

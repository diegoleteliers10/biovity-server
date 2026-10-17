import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import type {
  ApplicationEvaluationRecord,
  IApplicationEvaluationRepository,
  UpsertApplicationEvaluation,
} from '../../core/repositories/application-evaluation.repository';
import { ApplicationEvaluationEntity } from '../database/orm/application-evaluation.entity';

type EvaluationRow = Omit<ApplicationEvaluationRecord, 'created_at' | 'updated_at'> & {
  created_at: Date | string;
  updated_at: Date | string;
};

function asIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function toRecord(row: EvaluationRow): ApplicationEvaluationRecord {
  return {
    ...row,
    created_at: asIsoString(row.created_at),
    updated_at: asIsoString(row.updated_at),
  };
}

@Injectable()
export class ApplicationEvaluationRepositoryImpl implements IApplicationEvaluationRepository {
  constructor(
    @InjectRepository(ApplicationEvaluationEntity)
    private readonly repository: Repository<ApplicationEvaluationEntity>,
  ) {}

  async findByApplicationIds(
    applicationIds: readonly string[],
  ): Promise<ApplicationEvaluationRecord[]> {
    const rows = await this.repository
      .createQueryBuilder('evaluation')
      .innerJoin('evaluation.evaluator', 'evaluator')
      .select('evaluation.id', 'id')
      .addSelect('evaluation.applicationId', 'application_id')
      .addSelect('evaluation.evaluatorId', 'evaluator_id')
      .addSelect('evaluator.name', 'evaluator_name')
      .addSelect('evaluation.rating', 'rating')
      .addSelect('evaluation.notes', 'notes')
      .addSelect('evaluation.skillsAssessment', 'skills_assessment')
      .addSelect('evaluation.createdAt', 'created_at')
      .addSelect('evaluation.updatedAt', 'updated_at')
      .where({ applicationId: In([...applicationIds]) })
      .orderBy('evaluation.updatedAt', 'DESC')
      .addOrderBy('evaluation.id', 'DESC')
      .getRawMany<EvaluationRow>();
    return rows.map(toRecord);
  }

  async upsert(
    input: UpsertApplicationEvaluation,
  ): Promise<ApplicationEvaluationRecord | null> {
    await this.repository.upsert(
      {
        applicationId: input.applicationId,
        evaluatorId: input.evaluatorId,
        rating: input.rating,
        notes: input.notes,
        skillsAssessment: input.skillsAssessment,
      },
      { conflictPaths: ['applicationId', 'evaluatorId'], skipUpdateIfNoValuesChanged: false },
    );
    const rows = await this.findByApplicationIds([input.applicationId]);
    const record = rows.find(row => row.evaluator_id === input.evaluatorId);
    return record ?? null;
  }
}

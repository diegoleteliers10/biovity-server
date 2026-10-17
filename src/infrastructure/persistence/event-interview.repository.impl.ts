import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import type {
  EventInterviewEvaluation,
  EventInterviewAuditRecord,
  EventInterviewOutcome,
  IEventInterviewRepository,
} from '../../core/repositories/event-interview.repository';
import type {
  EventInterviewRubric,
  InterviewRole,
  InterviewCriterionResponse,
  PipelineStageRubricCriterion,
} from '../../core/domain/entities/pipeline-stage-rubric';
import { GENERAL_INTERVIEW_ROLE } from '../../core/domain/entities/pipeline-stage-rubric';

type EvaluationRow = Omit<
  EventInterviewEvaluation,
  'created_at' | 'updated_at'
> & {
  created_at: Date | string;
  updated_at: Date | string;
};
type OutcomeRow = Omit<EventInterviewOutcome, 'updated_at'> & {
  updated_at: Date | string;
};
type AuditRow = Omit<EventInterviewAuditRecord, 'created_at'> & {
  created_at: Date | string;
};

function asIsoString(value: Date | string): string {
  return value instanceof Date
    ? value.toISOString()
    : new Date(value).toISOString();
}

function toEvaluation(row: EvaluationRow): EventInterviewEvaluation {
  return {
    ...row,
    created_at: asIsoString(row.created_at),
    updated_at: asIsoString(row.updated_at),
  };
}

function toOutcome(row: OutcomeRow): EventInterviewOutcome {
  return { ...row, updated_at: asIsoString(row.updated_at) };
}

@Injectable()
export class EventInterviewRepositoryImpl implements IEventInterviewRepository {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async findEvaluations(eventId: string): Promise<EventInterviewEvaluation[]> {
    const rows = await this.dataSource.query<EvaluationRow[]>(
      `SELECT evaluation.id,
              evaluation.event_id,
              evaluation.evaluator_id,
              evaluator.name AS evaluator_name,
              evaluation.evaluator_role_id,
              evaluation.evaluator_role_label,
              evaluation.rating,
              evaluation.notes,
              evaluation.skills_assessment,
              evaluation.criterion_responses,
              evaluation.rubric_version_id,
              evaluation.recommendation,
              evaluation.created_at,
              evaluation.updated_at
       FROM event_interview_evaluation evaluation
       JOIN "user" evaluator ON evaluator.id = evaluation.evaluator_id
       WHERE evaluation.event_id = $1::uuid
       ORDER BY evaluation.updated_at DESC, evaluation.id ASC`,
      [eventId],
    );
    return rows.map(toEvaluation);
  }

  async findRubric(eventId: string): Promise<EventInterviewRubric | null> {
    const rows = await this.dataSource.query<
      Array<{
        stage_name: string | null;
        version_id: string | null;
        roles: InterviewRole[] | null;
        criteria: PipelineStageRubricCriterion[] | null;
      }>
    >(
      `SELECT event.pipeline_stage_name_snapshot AS stage_name,
              event.rubric_version_id AS version_id,
              rubric.roles,
              rubric.criteria
       FROM event
       LEFT JOIN pipeline_stage_rubric_version rubric
         ON rubric.id = event.rubric_version_id
       WHERE event.id = $1::uuid`,
      [eventId],
    );
    const row = rows[0];
    if (!row?.stage_name) return null;
    return {
      stage_name: row.stage_name,
      version_id: row.version_id,
      roles: row.roles ?? [GENERAL_INTERVIEW_ROLE],
      criteria: (row.criteria ?? []).map(criterion => ({
        ...criterion,
        roleIds: criterion.roleIds ?? [],
      })),
    };
  }

  async findAudit(eventId: string): Promise<EventInterviewAuditRecord[]> {
    const rows = await this.dataSource.query<AuditRow[]>(
      `SELECT audit.id,
              audit.actor_id,
              audit.actor_name,
              audit.record_type,
              audit.subject_user_id,
              audit.action,
              audit.before_data,
              audit.after_data,
              audit.created_at
       FROM event_interview_audit audit
       WHERE audit.event_id = $1::uuid
       ORDER BY audit.created_at DESC, audit.id DESC`,
      [eventId],
    );
    return rows.map(row => ({
      ...row,
      created_at: asIsoString(row.created_at),
    }));
  }

  async upsertEvaluation(
    input: Parameters<IEventInterviewRepository['upsertEvaluation']>[0],
  ): Promise<EventInterviewEvaluation | null> {
    await this.dataSource.transaction(async manager => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [`${input.eventId}:${input.evaluatorId}`],
      );
      const previous = await manager.query<Array<Record<string, unknown>>>(
        `SELECT rating,
                notes,
                skills_assessment,
                recommendation,
                criterion_responses,
                rubric_version_id,
                evaluator_role_id,
                evaluator_role_label
         FROM event_interview_evaluation
         WHERE event_id = $1::uuid AND evaluator_id = $2::uuid
         FOR UPDATE`,
        [input.eventId, input.evaluatorId],
      );
      const after = {
        rating: input.rating,
        notes: input.notes,
        skills_assessment: input.skillsAssessment,
        criterion_responses: input.criterionResponses,
        recommendation: input.recommendation,
        evaluator_role_id: input.evaluatorRoleId,
        evaluator_role_label: input.evaluatorRoleLabel,
      };
      await manager.query(
        `INSERT INTO event_interview_evaluation
           (event_id, evaluator_id, rating, notes, skills_assessment, recommendation,
            rubric_version_id, criterion_responses, evaluator_role_id, evaluator_role_label)
         SELECT $1::uuid, $2::uuid, $3, $4, $5::jsonb, $6,
                event.rubric_version_id, $7::jsonb, $8, $9
         FROM event WHERE event.id = $1::uuid
         ON CONFLICT (event_id, evaluator_id) DO UPDATE SET
           rating = EXCLUDED.rating,
           notes = EXCLUDED.notes,
           skills_assessment = EXCLUDED.skills_assessment,
           recommendation = EXCLUDED.recommendation,
           rubric_version_id = EXCLUDED.rubric_version_id,
           criterion_responses = EXCLUDED.criterion_responses,
           evaluator_role_id = EXCLUDED.evaluator_role_id,
           evaluator_role_label = EXCLUDED.evaluator_role_label,
           updated_at = now()`,
        [
          input.eventId,
          input.evaluatorId,
          input.rating,
          input.notes,
          JSON.stringify(input.skillsAssessment),
          input.recommendation,
          JSON.stringify(input.criterionResponses),
          input.evaluatorRoleId,
          input.evaluatorRoleLabel,
        ],
      );
      await manager.query(
        `INSERT INTO event_interview_audit
           (event_id, actor_id, actor_name, record_type, subject_user_id, action, before_data, after_data)
         SELECT $1::uuid, $2::uuid, actor.name, 'evaluation', $2::uuid, $3, $4::jsonb, $5::jsonb
         FROM "user" actor WHERE actor.id = $2::uuid`,
        [
          input.eventId,
          input.evaluatorId,
          previous[0] ? 'changed' : 'saved',
          previous[0] ? JSON.stringify(previous[0]) : null,
          JSON.stringify(after),
        ],
      );
    });
    return (
      (await this.findEvaluations(input.eventId)).find(
        row => row.evaluator_id === input.evaluatorId,
      ) ?? null
    );
  }

  async findOutcome(eventId: string): Promise<EventInterviewOutcome | null> {
    const rows = await this.dataSource.query<OutcomeRow[]>(
      `SELECT result.event_id,
              result.outcome,
              result.decision_maker_id,
              decision_maker.name AS decision_maker_name,
              result.notes,
              result.updated_at
       FROM event_interview_outcome result
       JOIN "user" decision_maker ON decision_maker.id = result.decision_maker_id
       WHERE result.event_id = $1::uuid
       LIMIT 1`,
      [eventId],
    );
    return rows[0] ? toOutcome(rows[0]) : null;
  }

  async upsertOutcome(
    input: Parameters<IEventInterviewRepository['upsertOutcome']>[0],
  ): Promise<EventInterviewOutcome | null> {
    await this.dataSource.transaction(async manager => {
      await manager.query(
        'SELECT pg_advisory_xact_lock(hashtextextended($1, 0))',
        [input.eventId],
      );
      const previous = await manager.query<Array<Record<string, unknown>>>(
        `SELECT outcome, decision_maker_id, notes
         FROM event_interview_outcome WHERE event_id = $1::uuid FOR UPDATE`,
        [input.eventId],
      );
      const after = {
        outcome: input.outcome,
        decision_maker_id: input.decisionMakerId,
        notes: input.notes,
      };
      await manager.query(
        `INSERT INTO event_interview_outcome (event_id, outcome, decision_maker_id, notes)
         VALUES ($1::uuid, $2, $3::uuid, $4)
         ON CONFLICT (event_id) DO UPDATE SET
           outcome = EXCLUDED.outcome,
           decision_maker_id = EXCLUDED.decision_maker_id,
           notes = EXCLUDED.notes,
           updated_at = now()`,
        [input.eventId, input.outcome, input.decisionMakerId, input.notes],
      );
      await manager.query(
        `INSERT INTO event_interview_audit
           (event_id, actor_id, actor_name, record_type, action, before_data, after_data)
         SELECT $1::uuid, $2::uuid, actor.name, 'outcome', $3, $4::jsonb, $5::jsonb
         FROM "user" actor WHERE actor.id = $2::uuid`,
        [
          input.eventId,
          input.decisionMakerId,
          previous[0] ? 'changed' : 'saved',
          previous[0] ? JSON.stringify(previous[0]) : null,
          JSON.stringify(after),
        ],
      );
    });
    return this.findOutcome(input.eventId);
  }
}

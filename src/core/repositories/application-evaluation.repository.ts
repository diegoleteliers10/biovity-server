import type { EvaluationRating } from '../domain/entities/application-evaluation';

export type ApplicationEvaluationRecord = {
  id: string;
  application_id: string;
  evaluator_id: string;
  evaluator_name: string;
  rating: EvaluationRating;
  notes: string | null;
  skills_assessment: Record<string, string>;
  created_at: string;
  updated_at: string;
};

export type UpsertApplicationEvaluation = {
  applicationId: string;
  evaluatorId: string;
  rating: EvaluationRating;
  notes: string | null;
  skillsAssessment: Record<string, string>;
};

export interface IApplicationEvaluationRepository {
  findByApplicationIds(applicationIds: readonly string[]): Promise<ApplicationEvaluationRecord[]>;
  upsert(input: UpsertApplicationEvaluation): Promise<ApplicationEvaluationRecord | null>;
}

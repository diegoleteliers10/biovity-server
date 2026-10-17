import type {
  EventInterviewRubric,
  InterviewCriterionResponse,
} from '../domain/entities/pipeline-stage-rubric';

export type InterviewRecommendation = 'advance' | 'hold' | 'no_advance';
export type InterviewRating = 'positive' | 'neutral' | 'negative';

export type EventInterviewEvaluation = {
  id: string;
  event_id: string;
  evaluator_id: string;
  evaluator_name: string;
  evaluator_role_id: string | null;
  evaluator_role_label: string | null;
  rating: InterviewRating;
  notes: string | null;
  skills_assessment: Record<string, string>;
  criterion_responses: InterviewCriterionResponse[];
  rubric_version_id: string | null;
  recommendation: InterviewRecommendation | null;
  created_at: string;
  updated_at: string;
};

export type EventInterviewOutcome = {
  event_id: string;
  outcome: InterviewRecommendation;
  decision_maker_id: string;
  decision_maker_name: string;
  notes: string | null;
  updated_at: string;
};

export type EventInterviewAuditRecord = {
  id: string;
  actor_id: string;
  actor_name: string;
  record_type: 'evaluation' | 'outcome';
  subject_user_id: string | null;
  action: 'saved' | 'changed';
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown>;
  created_at: string;
};

export interface IEventInterviewRepository {
  findRubric(eventId: string): Promise<EventInterviewRubric | null>;
  findEvaluations(eventId: string): Promise<EventInterviewEvaluation[]>;
  findAudit(eventId: string): Promise<EventInterviewAuditRecord[]>;
  upsertEvaluation(input: {
    eventId: string;
    evaluatorId: string;
    rating: InterviewRating;
    notes: string | null;
    skillsAssessment: Record<string, string>;
    criterionResponses: InterviewCriterionResponse[];
    recommendation: InterviewRecommendation | null;
    evaluatorRoleId: string;
    evaluatorRoleLabel: string;
  }): Promise<EventInterviewEvaluation | null>;
  findOutcome(eventId: string): Promise<EventInterviewOutcome | null>;
  upsertOutcome(input: {
    eventId: string;
    decisionMakerId: string;
    outcome: InterviewRecommendation;
    notes: string | null;
  }): Promise<EventInterviewOutcome | null>;
}

export const EVENT_INTERVIEW_REPOSITORY = 'IEventInterviewRepository';

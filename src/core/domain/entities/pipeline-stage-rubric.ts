export type InterviewRole = {
  id: string;
  label: string;
};

export const GENERAL_INTERVIEW_ROLE: InterviewRole = {
  id: '00000000-0000-4000-8000-000000000001',
  label: 'General',
};

export type PipelineStageRubricCriterion = {
  id: string;
  label: string;
  description: string | null;
  roleIds: string[];
};

export type PipelineStageRubric = {
  stage_id: string;
  current_version_id: string | null;
  version: number;
  roles: InterviewRole[];
  criteria: PipelineStageRubricCriterion[];
};

export type EventInterviewRubric = {
  version_id: string | null;
  stage_name: string;
  roles: InterviewRole[];
  criteria: PipelineStageRubricCriterion[];
};

export type InterviewCriterionResponse = {
  criterion_id: string;
  score: number;
  evidence: string | null;
};

import { Inject, Injectable } from '@nestjs/common';
import {
  EVENT_INTERVIEW_REPOSITORY,
  type EventInterviewAuditRecord,
  type EventInterviewEvaluation,
  type EventInterviewOutcome,
  type IEventInterviewRepository,
  type InterviewRating,
  type InterviewRecommendation,
} from '../repositories/event-interview.repository';
import type {
  EventInterviewRubric,
  InterviewCriterionResponse,
} from '../domain/entities/pipeline-stage-rubric';

@Injectable()
export class EventInterviewService {
  constructor(
    @Inject(EVENT_INTERVIEW_REPOSITORY)
    private readonly interviews: IEventInterviewRepository,
  ) {}

  getEvaluations(eventId: string): Promise<EventInterviewEvaluation[]> {
    return this.interviews.findEvaluations(eventId);
  }

  getRubric(eventId: string): Promise<EventInterviewRubric | null> {
    return this.interviews.findRubric(eventId);
  }

  getAudit(eventId: string): Promise<EventInterviewAuditRecord[]> {
    return this.interviews.findAudit(eventId);
  }

  saveEvaluation(input: {
    eventId: string;
    evaluatorId: string;
    rating: InterviewRating;
    notes: string | null;
    skillsAssessment: Record<string, string>;
    criterionResponses: InterviewCriterionResponse[];
    recommendation: InterviewRecommendation | null;
    evaluatorRoleId: string;
    evaluatorRoleLabel: string;
  }): Promise<EventInterviewEvaluation | null> {
    return this.interviews.upsertEvaluation(input);
  }

  getOutcome(eventId: string): Promise<EventInterviewOutcome | null> {
    return this.interviews.findOutcome(eventId);
  }

  saveOutcome(input: {
    eventId: string;
    decisionMakerId: string;
    outcome: InterviewRecommendation;
    notes: string | null;
  }): Promise<EventInterviewOutcome | null> {
    return this.interviews.upsertOutcome(input);
  }
}

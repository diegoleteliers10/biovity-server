import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventInterviewService } from '../../../core/services/event-interview.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  SaveEventInterviewEvaluationDto,
  SaveEventInterviewOutcomeDto,
} from '../../dtos/event/event-interview.dto';

const SCORED_SKILLS = ['technical', 'cultural', 'expectations'] as const;
const EVALUATION_CONTEXTS = new Set([
  'cv_review',
  'initial_interview',
  'technical_interview',
  'final_review',
]);

@ApiTags('event-interviews')
@Controller('events')
export class EventInterviewController {
  constructor(
    private readonly interviews: EventInterviewService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get(':id/interview-evaluations')
  async getInterviewRecords(
    @Param('id', ParseUUIDPipe) eventId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    const access = await this.organizationAccess.assertCompletedInterviewAccess(
      eventId,
      requester,
      false,
      'read',
    );
    const [evaluations, outcome, audit, rubric] = await Promise.all([
      access.canViewHiringRecords
        ? this.interviews.getEvaluations(eventId)
        : Promise.resolve([]),
      this.interviews.getOutcome(eventId),
      access.canViewHiringRecords
        ? this.interviews.getAudit(eventId)
        : Promise.resolve([]),
      access.canViewHiringRecords
        ? this.interviews.getRubric(eventId)
        : Promise.resolve(null),
    ]);
    const roleScoped = access.isInterviewer;
    const visibleCriteria = (rubric?.criteria ?? []).filter(
      criterion =>
        criterion.roleIds.length === 0 ||
        (access.interviewerRoleId !== null &&
          criterion.roleIds.includes(access.interviewerRoleId)),
    );
    const visibleCriterionIds = new Set(
      visibleCriteria.map(criterion => criterion.id),
    );
    const visibleEvaluations = roleScoped
      ? evaluations
          .filter(
            evaluation =>
              evaluation.evaluator_role_id === access.interviewerRoleId,
          )
          .map(evaluation => ({
            ...evaluation,
            criterion_responses: evaluation.criterion_responses.filter(
              response => visibleCriterionIds.has(response.criterion_id),
            ),
          }))
      : evaluations;
    const visibleOutcome =
      outcome && !access.canViewHiringRecords
        ? { outcome: outcome.outcome }
        : outcome;
    return {
      evaluations: visibleEvaluations,
      outcome: visibleOutcome,
      audit: roleScoped ? [] : audit,
      rubric:
        roleScoped && rubric
          ? { ...rubric, criteria: visibleCriteria }
          : rubric,
      viewerRoleId: access.interviewerRoleId,
      viewerRoleLabel: access.interviewerRoleLabel,
      canViewHiringRecords: access.canViewHiringRecords,
      canEvaluate: access.canViewHiringRecords && access.isInterviewer,
      canViewOutcome: true,
      canDecideOutcome: access.canViewHiringRecords,
    };
  }

  @Put(':id/interview-evaluations/me')
  async saveOwnEvaluation(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() dto: SaveEventInterviewEvaluationDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    const access = await this.organizationAccess.assertCompletedInterviewAccess(
      eventId,
      requester,
      true,
    );
    if (!requester) {
      throw new BadRequestException('Se requiere una sesión de usuario.');
    }
    if (!access.interviewerRoleId || !access.interviewerRoleLabel) {
      return Promise.reject(
        new BadRequestException(
          'La asignación de entrevistador no tiene un rol válido.',
        ),
      );
    }
    const rubric = await this.interviews.getRubric(eventId);
    const criterionResponses = dto.criterionResponses ?? [];
    const applicableCriteria = (rubric?.criteria ?? []).filter(
      criterion =>
        criterion.roleIds.length === 0 ||
        criterion.roleIds.includes(access.interviewerRoleId ?? ''),
    );
    const expectedCriterionIds = new Set(
      applicableCriteria.map(criterion => criterion.id),
    );
    const providedCriterionIds = criterionResponses.map(
      response => response.criterionId,
    );
    const invalidCriterionResponses =
      providedCriterionIds.length !== expectedCriterionIds.size ||
      new Set(providedCriterionIds).size !== providedCriterionIds.length ||
      providedCriterionIds.some(id => !expectedCriterionIds.has(id));
    const skillsAssessment = dto.skillsAssessment ?? {};
    const invalidSkills = Object.entries(skillsAssessment).some(
      ([skill, score]) =>
        !['technical', 'cultural', 'expectations', 'context'].includes(skill) ||
        typeof score !== 'string',
    );
    const invalidScores = SCORED_SKILLS.some(skill => {
      const score = skillsAssessment[skill];
      return score !== undefined && !/^[0-5]$/.test(score);
    });
    const context = skillsAssessment.context;
    const invalidContext =
      context !== undefined && !EVALUATION_CONTEXTS.has(context);
    const missingNotes = dto.rating !== 'positive' && !dto.notes?.trim();
    if (
      invalidSkills ||
      invalidScores ||
      invalidContext ||
      missingNotes ||
      invalidCriterionResponses
    ) {
      throw new BadRequestException(
        'Revisa los puntajes, los criterios, el contexto y la justificación de la evaluación.',
      );
    }
    const saved = await this.interviews.saveEvaluation({
      eventId,
      evaluatorId: requester.id,
      rating: dto.rating,
      notes: dto.notes?.trim() || null,
      skillsAssessment,
      criterionResponses: criterionResponses.map(response => ({
        criterion_id: response.criterionId,
        score: response.score,
        evidence: response.evidence?.trim() || null,
      })),
      recommendation: dto.recommendation ?? null,
      evaluatorRoleId: access.interviewerRoleId,
      evaluatorRoleLabel: access.interviewerRoleLabel,
    });
    if (!saved) {
      throw new InternalServerErrorException(
        'No se pudo recuperar la evaluación guardada.',
      );
    }
    return saved;
  }

  @Put(':id/interview-outcome')
  async saveInterviewOutcome(
    @Param('id', ParseUUIDPipe) eventId: string,
    @Body() dto: SaveEventInterviewOutcomeDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertCompletedInterviewAccess(
      eventId,
      requester,
      false,
      'recruit',
    );
    if (!requester) {
      throw new BadRequestException('Se requiere una sesión de usuario.');
    }
    const saved = await this.interviews.saveOutcome({
      eventId,
      decisionMakerId: requester.id,
      outcome: dto.outcome,
      notes: dto.notes?.trim() || null,
    });
    if (!saved) {
      throw new InternalServerErrorException(
        'No se pudo recuperar el resultado guardado.',
      );
    }
    return saved;
  }
}

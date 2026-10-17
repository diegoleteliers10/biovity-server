import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { EventInterviewService } from '../../../core/services/event-interview.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { EventInterviewController } from './event-interview.controller';

describe('EventInterviewController', () => {
  const requester: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'recruiter@example.com',
    type: 'organization',
    organizationId: '22222222-2222-4222-8222-222222222222',
  };
  const interviews = {
    getEvaluations: jest.fn(),
    getOutcome: jest.fn(),
    getAudit: jest.fn(),
    getRubric: jest.fn(),
    saveEvaluation: jest.fn(),
    saveOutcome: jest.fn(),
  };
  const access = { assertCompletedInterviewAccess: jest.fn() };
  const controller = new EventInterviewController(
    interviews as unknown as EventInterviewService,
    access as unknown as OrganizationAccessService,
  );

  beforeEach(() => {
    jest.resetAllMocks();
    access.assertCompletedInterviewAccess.mockResolvedValue({
      organizationId: requester.organizationId,
      isInterviewer: true,
      interviewerRoleId: 'general-role-id',
      interviewerRoleLabel: 'General',
      canViewHiringRecords: true,
    });
    interviews.getEvaluations.mockResolvedValue([]);
    interviews.getOutcome.mockResolvedValue(null);
    interviews.getAudit.mockResolvedValue([]);
    interviews.getRubric.mockResolvedValue(null);
    interviews.saveEvaluation.mockResolvedValue({ id: 'evaluation-id' });
    interviews.saveOutcome.mockResolvedValue({ event_id: 'event-id' });
  });

  it('returns hiring records and decision capability after access checks', async () => {
    interviews.getOutcome.mockResolvedValue({
      outcome: 'advance',
      decision_maker_id: requester.id,
      decision_maker_name: 'Recruiter',
      notes: 'Internal notes',
      event_id: 'event-id',
      updated_at: '2026-10-16T00:00:00.000Z',
    });

    await expect(
      controller.getInterviewRecords('event-id', requester),
    ).resolves.toEqual({
      evaluations: [],
      outcome: {
        outcome: 'advance',
        decision_maker_id: requester.id,
        decision_maker_name: 'Recruiter',
        notes: 'Internal notes',
        event_id: 'event-id',
        updated_at: '2026-10-16T00:00:00.000Z',
      },
      audit: [],
      rubric: null,
      viewerRoleId: 'general-role-id',
      viewerRoleLabel: 'General',
      canViewHiringRecords: true,
      canEvaluate: true,
      canViewOutcome: true,
      canDecideOutcome: true,
    });
    expect(access.assertCompletedInterviewAccess).toHaveBeenCalledWith(
      'event-id',
      requester,
      false,
      'read',
    );
  });

  it('lets a viewer read the outcome without permission to change it or read private hiring records', async () => {
    access.assertCompletedInterviewAccess.mockResolvedValue({
      organizationId: requester.organizationId,
      isInterviewer: false,
      interviewerRoleId: null,
      interviewerRoleLabel: null,
      canViewHiringRecords: false,
    });
    interviews.getOutcome.mockResolvedValue({
      outcome: 'hold',
      decision_maker_id: requester.id,
      decision_maker_name: 'Recruiter',
      notes: 'Private decision notes',
      event_id: 'event-id',
      updated_at: '2026-10-16T00:00:00.000Z',
    });

    await expect(
      controller.getInterviewRecords('event-id', requester),
    ).resolves.toEqual({
      evaluations: [],
      outcome: { outcome: 'hold' },
      audit: [],
      rubric: null,
      viewerRoleId: null,
      viewerRoleLabel: null,
      canViewHiringRecords: false,
      canEvaluate: false,
      canViewOutcome: true,
      canDecideOutcome: false,
    });
    expect(interviews.getOutcome).toHaveBeenCalledWith('event-id');
    expect(interviews.getEvaluations).not.toHaveBeenCalled();
    expect(interviews.getAudit).not.toHaveBeenCalled();
    expect(interviews.getRubric).not.toHaveBeenCalled();

    access.assertCompletedInterviewAccess.mockRejectedValue(
      new ForbiddenException(),
    );
    await expect(
      controller.saveInterviewOutcome(
        'event-id',
        { outcome: 'advance' },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(access.assertCompletedInterviewAccess).toHaveBeenLastCalledWith(
      'event-id',
      requester,
      false,
      'recruit',
    );
    expect(interviews.saveOutcome).not.toHaveBeenCalled();
  });

  it.each([
    ['recruiter', requester],
    [
      'admin',
      {
        ...requester,
        id: '33333333-3333-4333-8333-333333333333',
        email: 'admin@example.com',
        type: 'admin' as const,
      },
    ],
  ])('allows %s to save the company outcome', async (_role, user) => {
    await controller.saveInterviewOutcome(
      'event-id',
      { outcome: 'advance' },
      user,
    );

    expect(access.assertCompletedInterviewAccess).toHaveBeenCalledWith(
      'event-id',
      user,
      false,
      'recruit',
    );
    expect(interviews.saveOutcome).toHaveBeenCalledWith({
      eventId: 'event-id',
      decisionMakerId: user.id,
      outcome: 'advance',
      notes: null,
    });
  });

  it('limits interviewer records and criterion evidence to the assigned role', async () => {
    access.assertCompletedInterviewAccess.mockResolvedValue({
      organizationId: requester.organizationId,
      isInterviewer: true,
      interviewerRoleId: 'role-a',
      interviewerRoleLabel: 'Técnica',
      canViewHiringRecords: true,
    });
    interviews.getRubric.mockResolvedValue({
      version_id: 'rubric-v1',
      stage_name: 'Entrevista técnica',
      criteria: [
        { id: 'shared', label: 'Común', description: null, roleIds: [] },
        {
          id: 'only-a',
          label: 'Técnico',
          description: null,
          roleIds: ['role-a'],
        },
        {
          id: 'only-b',
          label: 'Cultural',
          description: null,
          roleIds: ['role-b'],
        },
      ],
    });
    interviews.getEvaluations.mockResolvedValue([
      {
        id: 'evaluation-a',
        evaluator_role_id: 'role-a',
        criterion_responses: [
          { criterion_id: 'shared', score: 4, evidence: null },
          { criterion_id: 'only-a', score: 5, evidence: 'A evidence' },
          { criterion_id: 'only-b', score: 1, evidence: 'B evidence' },
        ],
      },
      {
        id: 'evaluation-b',
        evaluator_role_id: 'role-b',
        criterion_responses: [
          { criterion_id: 'only-b', score: 2, evidence: 'Private B evidence' },
        ],
      },
    ]);

    await expect(
      controller.getInterviewRecords('event-id', requester),
    ).resolves.toMatchObject({
      evaluations: [
        {
          id: 'evaluation-a',
          criterion_responses: [
            { criterion_id: 'shared', score: 4, evidence: null },
            { criterion_id: 'only-a', score: 5, evidence: 'A evidence' },
          ],
        },
      ],
      rubric: { criteria: [{ id: 'shared' }, { id: 'only-a' }] },
    });
  });

  it('uses the session user as evaluator, never a body-supplied evaluator', async () => {
    await controller.saveOwnEvaluation(
      'event-id',
      { rating: 'positive', recommendation: 'advance' },
      requester,
    );
    expect(interviews.saveEvaluation).toHaveBeenCalledWith({
      eventId: 'event-id',
      evaluatorId: requester.id,
      evaluatorRoleId: 'general-role-id',
      evaluatorRoleLabel: 'General',
      rating: 'positive',
      notes: null,
      skillsAssessment: {},
      criterionResponses: [],
      recommendation: 'advance',
    });
    expect(access.assertCompletedInterviewAccess).toHaveBeenCalledWith(
      'event-id',
      requester,
      true,
    );
  });

  it('requires a reason for neutral or negative ratings', async () => {
    await expect(
      controller.saveOwnEvaluation(
        'event-id',
        { rating: 'neutral' },
        requester,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(interviews.saveEvaluation).not.toHaveBeenCalled();
  });

  it('requires a response for each captured rubric criterion', async () => {
    interviews.getRubric.mockResolvedValue({
      version_id: '33333333-3333-4333-8333-333333333333',
      stage_name: 'Entrevista técnica',
      criteria: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          label: 'Diseño experimental',
          description: null,
          roleIds: [],
        },
      ],
    });
    await expect(
      controller.saveOwnEvaluation(
        'event-id',
        { rating: 'positive' },
        requester,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(interviews.saveEvaluation).not.toHaveBeenCalled();
  });

  it('saves scores and evidence for the captured criteria', async () => {
    interviews.getRubric.mockResolvedValue({
      version_id: '33333333-3333-4333-8333-333333333333',
      stage_name: 'Entrevista técnica',
      criteria: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          label: 'Diseño experimental',
          description: null,
          roleIds: [],
        },
      ],
    });
    await controller.saveOwnEvaluation(
      'event-id',
      {
        rating: 'positive',
        criterionResponses: [
          {
            criterionId: '44444444-4444-4444-8444-444444444444',
            score: 4,
            evidence: 'Explicó controles y réplicas.',
          },
        ],
      },
      requester,
    );
    expect(interviews.saveEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        criterionResponses: [
          {
            criterion_id: '44444444-4444-4444-8444-444444444444',
            score: 4,
            evidence: 'Explicó controles y réplicas.',
          },
        ],
      }),
    );
  });

  it('accepts only shared criteria and criteria assigned to the interviewer role', async () => {
    access.assertCompletedInterviewAccess.mockResolvedValue({
      organizationId: requester.organizationId,
      isInterviewer: true,
      interviewerRoleId: 'role-a',
      interviewerRoleLabel: 'Técnica',
    });
    interviews.getRubric.mockResolvedValue({
      version_id: '33333333-3333-4333-8333-333333333333',
      stage_name: 'Entrevista técnica',
      criteria: [
        {
          id: '44444444-4444-4444-8444-444444444444',
          label: 'Criterio común',
          description: null,
          roleIds: [],
        },
        {
          id: '55555555-5555-4555-8555-555555555555',
          label: 'Criterio técnico',
          description: null,
          roleIds: ['role-a'],
        },
        {
          id: '66666666-6666-4666-8666-666666666666',
          label: 'Criterio cultural',
          description: null,
          roleIds: ['role-b'],
        },
      ],
    });

    await controller.saveOwnEvaluation(
      'event-id',
      {
        rating: 'positive',
        criterionResponses: [
          {
            criterionId: '44444444-4444-4444-8444-444444444444',
            score: 4,
          },
          {
            criterionId: '55555555-5555-4555-8555-555555555555',
            score: 5,
          },
        ],
      },
      requester,
    );

    expect(interviews.saveEvaluation).toHaveBeenCalledWith(
      expect.objectContaining({
        criterionResponses: [
          {
            criterion_id: '44444444-4444-4444-8444-444444444444',
            score: 4,
            evidence: null,
          },
          {
            criterion_id: '55555555-5555-4555-8555-555555555555',
            score: 5,
            evidence: null,
          },
        ],
      }),
    );

    await expect(
      controller.saveOwnEvaluation(
        'event-id',
        {
          rating: 'positive',
          criterionResponses: [
            {
              criterionId: '44444444-4444-4444-8444-444444444444',
              score: 4,
            },
            {
              criterionId: '55555555-5555-4555-8555-555555555555',
              score: 5,
            },
            {
              criterionId: '66666666-6666-4666-8666-666666666666',
              score: 1,
            },
          ],
        },
        requester,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(interviews.saveEvaluation).toHaveBeenCalledTimes(1);
  });

  it('stores the final interview outcome without changing the application stage', async () => {
    await controller.saveInterviewOutcome(
      'event-id',
      { outcome: 'hold', notes: 'Compare with the next interview.' },
      requester,
    );
    expect(interviews.saveOutcome).toHaveBeenCalledWith({
      eventId: 'event-id',
      decisionMakerId: requester.id,
      outcome: 'hold',
      notes: 'Compare with the next interview.',
    });
    expect(access.assertCompletedInterviewAccess).toHaveBeenLastCalledWith(
      'event-id',
      requester,
      false,
      'recruit',
    );
  });
});

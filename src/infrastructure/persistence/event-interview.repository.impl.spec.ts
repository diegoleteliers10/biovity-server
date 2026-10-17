import { DataSource, EntityManager } from 'typeorm';
import { EventInterviewRepositoryImpl } from './event-interview.repository.impl';

describe('EventInterviewRepositoryImpl', () => {
  it('saves an evaluation and its immutable audit row in one transaction', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ rating: 'positive', notes: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };
    const dataSource = {
      transaction: jest.fn(
        async (work: (manager: EntityManager) => Promise<unknown>) =>
          work(manager as unknown as EntityManager),
      ),
      query: jest.fn().mockResolvedValue([
        {
          id: 'evaluation-id',
          event_id: 'event-id',
          evaluator_id: 'reviewer-id',
          evaluator_name: 'Reviewer',
          rating: 'neutral',
          notes: 'Explain the neutral rating.',
          skills_assessment: {},
          criterion_responses: [],
          rubric_version_id: null,
          recommendation: 'hold',
          created_at: new Date('2026-10-11T10:00:00Z'),
          updated_at: new Date('2026-10-11T10:00:00Z'),
        },
      ]),
    } as unknown as DataSource;
    const repository = new EventInterviewRepositoryImpl(dataSource);

    await expect(
      repository.upsertEvaluation({
        eventId: 'event-id',
        evaluatorId: 'reviewer-id',
        evaluatorRoleId: 'general-role-id',
        evaluatorRoleLabel: 'General',
        rating: 'neutral',
        notes: 'Explain the neutral rating.',
        skillsAssessment: {},
        criterionResponses: [],
        recommendation: 'hold',
      }),
    ).resolves.toMatchObject({
      id: 'evaluation-id',
      evaluator_id: 'reviewer-id',
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(manager.query).toHaveBeenCalledTimes(4);
    expect(manager.query.mock.calls[3]?.[0]).toContain(
      'INSERT INTO event_interview_audit',
    );
    expect(manager.query.mock.calls[3]?.[1]).toEqual([
      'event-id',
      'reviewer-id',
      'changed',
      JSON.stringify({ rating: 'positive', notes: null }),
      JSON.stringify({
        rating: 'neutral',
        notes: 'Explain the neutral rating.',
        skills_assessment: {},
        criterion_responses: [],
        recommendation: 'hold',
        evaluator_role_id: 'general-role-id',
        evaluator_role_label: 'General',
      }),
    ]);
  });

  it('persists a final interview outcome and audit entry in one transaction', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
    };
    const dataSource = {
      transaction: jest.fn(
        async (work: (manager: EntityManager) => Promise<unknown>) =>
          work(manager as unknown as EntityManager),
      ),
      query: jest.fn().mockResolvedValue([
        {
          event_id: 'event-id',
          outcome: 'advance',
          decision_maker_id: 'recruiter-id',
          decision_maker_name: 'Recruiter',
          notes: null,
          updated_at: new Date('2026-10-11T10:00:00Z'),
        },
      ]),
    } as unknown as DataSource;
    const repository = new EventInterviewRepositoryImpl(dataSource);

    await expect(
      repository.upsertOutcome({
        eventId: 'event-id',
        decisionMakerId: 'recruiter-id',
        outcome: 'advance',
        notes: null,
      }),
    ).resolves.toMatchObject({ event_id: 'event-id', outcome: 'advance' });

    expect(manager.query).toHaveBeenCalledTimes(4);
    expect(manager.query.mock.calls[3]?.[0]).toContain(
      'INSERT INTO event_interview_audit',
    );
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });
});

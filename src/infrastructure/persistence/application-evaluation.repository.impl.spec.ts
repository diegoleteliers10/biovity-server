import type { Repository } from 'typeorm';
import { ApplicationEvaluationRepositoryImpl } from './application-evaluation.repository.impl';
import { ApplicationEvaluationEntity } from '../database/orm/application-evaluation.entity';

describe('ApplicationEvaluationRepositoryImpl', () => {
  it('upserts on the application and evaluator pair', async () => {
    const row = {
      id: 'c81fbd4b-f755-47d0-881e-ebaf2a781aaa',
      application_id: 'a3dbe317-8fae-4f3d-a797-af16d24848b9',
      evaluator_id: 'f4884d6f-9c4f-4b9c-8ac7-4a2e95a2ec8f',
      evaluator_name: 'Recruiter',
      rating: 'positive' as const,
      notes: null,
      skills_assessment: {},
      created_at: new Date('2026-10-09T12:00:00.000Z'),
      updated_at: new Date('2026-10-09T12:00:00.000Z'),
    };
    const builder = {
      innerJoin: jest.fn().mockReturnThis(),
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([row]),
    };
    const repository = {
      upsert: jest.fn().mockResolvedValue({ identifiers: [] }),
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    } as unknown as Repository<ApplicationEvaluationEntity>;
    const implementation = new ApplicationEvaluationRepositoryImpl(repository);

    const saved = await implementation.upsert({
      applicationId: row.application_id,
      evaluatorId: row.evaluator_id,
      rating: 'positive',
      notes: null,
      skillsAssessment: {},
    });

    expect(repository.upsert).toHaveBeenCalledWith(
      {
        applicationId: row.application_id,
        evaluatorId: row.evaluator_id,
        rating: 'positive',
        notes: null,
        skillsAssessment: {},
      },
      { conflictPaths: ['applicationId', 'evaluatorId'], skipUpdateIfNoValuesChanged: false },
    );
    expect(saved?.evaluator_id).toBe(row.evaluator_id);
    expect(saved?.created_at).toBe('2026-10-09T12:00:00.000Z');
  });
});

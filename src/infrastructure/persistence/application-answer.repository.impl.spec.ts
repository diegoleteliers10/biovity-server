import type { Repository } from 'typeorm';
import { ApplicationAnswer } from '../../core/domain/entities/application.entity';
import { ApplicationAnswerEntity } from '../database/orm/application-answer.entity';
import { ApplicationAnswerRepositoryImpl } from './application-answer.repository.impl';

const makeEntity = (id: string, applicationId: string, questionId: string) => {
  const entity = new ApplicationAnswerEntity();
  entity.id = id;
  entity.applicationId = applicationId;
  entity.questionId = questionId;
  entity.value = `answer-${questionId}`;
  entity.createdAt = new Date('2026-10-10T12:00:00.000Z');
  return entity;
};

describe('ApplicationAnswerRepositoryImpl', () => {
  it('finds an answer by ID and maps it to the domain entity', async () => {
    const row = makeEntity('answer-id', 'application-id', 'question-id');
    const repository = {
      findOne: jest.fn().mockResolvedValue(row),
    } as unknown as Repository<ApplicationAnswerEntity>;
    const implementation = new ApplicationAnswerRepositoryImpl(repository);

    const result = await implementation.findById('answer-id');

    expect(repository.findOne).toHaveBeenCalledWith({
      where: { id: 'answer-id' },
    });
    expect(result).toEqual(
      new ApplicationAnswer(
        row.id,
        row.applicationId,
        row.questionId,
        row.value,
        row.createdAt,
      ),
    );
  });

  it('returns null when the answer ID does not exist', async () => {
    const repository = {
      findOne: jest.fn().mockResolvedValue(null),
    } as unknown as Repository<ApplicationAnswerEntity>;
    const implementation = new ApplicationAnswerRepositoryImpl(repository);

    await expect(implementation.findById('missing-id')).resolves.toBeNull();
  });

  it('finds and maps answers for one application', async () => {
    const rows = [makeEntity('answer-id', 'application-id', 'question-id')];
    const repository = {
      find: jest.fn().mockResolvedValue(rows),
    } as unknown as Repository<ApplicationAnswerEntity>;
    const implementation = new ApplicationAnswerRepositoryImpl(repository);

    const result = await implementation.findByApplicationId('application-id');

    expect(repository.find).toHaveBeenCalledWith({
      where: { applicationId: 'application-id' },
    });
    expect(result).toHaveLength(1);
    expect(result[0]).toBeInstanceOf(ApplicationAnswer);
    expect(result[0]?.questionId).toBe('question-id');
  });

  it.each([
    { count: 1, expected: true },
    { count: 0, expected: false },
  ])(
    'maps question-answer count $count to $expected',
    async ({ count, expected }) => {
      const repository = {
        count: jest.fn().mockResolvedValue(count),
      } as unknown as Repository<ApplicationAnswerEntity>;
      const implementation = new ApplicationAnswerRepositoryImpl(repository);

      await expect(
        implementation.existsByQuestionId('question-id'),
      ).resolves.toBe(expected);
      expect(repository.count).toHaveBeenCalledWith({
        where: { questionId: 'question-id' },
      });
    },
  );
  it('creates an answer and maps it to the domain entity', async () => {
    const input = new ApplicationAnswer(
      'answer-id',
      'application-id',
      'question-id',
      'response',
      new Date('2026-10-10T12:00:00.000Z'),
    );
    const saved = makeEntity(input.id, input.applicationId, input.questionId);
    saved.value = input.value;
    const repository = {
      save: jest.fn().mockResolvedValue(saved),
    } as unknown as Repository<ApplicationAnswerEntity>;
    const implementation = new ApplicationAnswerRepositoryImpl(repository);

    const result = await implementation.create(input);

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: input.id,
        applicationId: input.applicationId,
        questionId: input.questionId,
        value: input.value,
        createdAt: input.createdAt,
      }),
    );
    expect(result).toEqual(input);
    expect(result).toBeInstanceOf(ApplicationAnswer);
  });

  it('creates multiple answers and maps each saved entity', async () => {
    const inputs = [
      new ApplicationAnswer('a1', 'app1', 'q1', 'one'),
      new ApplicationAnswer('a2', 'app1', 'q2', 'two'),
    ];
    const saved = inputs.map(input => {
      const entity = makeEntity(
        input.id,
        input.applicationId,
        input.questionId,
      );
      entity.value = input.value;
      entity.createdAt = input.createdAt;
      return entity;
    });
    const repository = {
      save: jest.fn().mockResolvedValue(saved),
    } as unknown as Repository<ApplicationAnswerEntity>;
    const implementation = new ApplicationAnswerRepositoryImpl(repository);

    const result = await implementation.bulkCreate(inputs);

    expect(repository.save).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'a1',
          applicationId: 'app1',
          questionId: 'q1',
        }),
        expect.objectContaining({
          id: 'a2',
          applicationId: 'app1',
          questionId: 'q2',
        }),
      ]),
    );
    expect(result).toEqual(inputs);
    expect(result.every(answer => answer instanceof ApplicationAnswer)).toBe(
      true,
    );
  });

  it('returns answers for multiple applications and maps each row', async () => {
    const rows = [
      makeEntity('a1', 'app1', 'q1'),
      makeEntity('a2', 'app2', 'q2'),
    ];
    const builder = {
      where: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue(rows),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(builder),
    } as unknown as Repository<ApplicationAnswerEntity>;
    const implementation = new ApplicationAnswerRepositoryImpl(repository);

    const result = await implementation.findByApplicationIds(['app1', 'app2']);

    expect(repository.createQueryBuilder).toHaveBeenCalledWith('aa');
    expect(builder.where).toHaveBeenCalledWith(
      'aa.application_id IN (:...ids)',
      {
        ids: ['app1', 'app2'],
      },
    );
    expect(result.map(answer => answer.applicationId)).toEqual([
      'app1',
      'app2',
    ]);
    expect(result.every(answer => answer instanceof ApplicationAnswer)).toBe(
      true,
    );
  });

  it('returns no answers without querying when the application list is empty', async () => {
    const repository = {
      createQueryBuilder: jest.fn(),
    } as unknown as Repository<ApplicationAnswerEntity>;
    const implementation = new ApplicationAnswerRepositoryImpl(repository);

    await expect(implementation.findByApplicationIds([])).resolves.toEqual([]);
    expect(repository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it.each([
    { affected: 1, expected: true },
    { affected: 0, expected: false },
    { affected: null, expected: false },
  ])(
    'maps delete affected=$affected to $expected',
    async ({ affected, expected }) => {
      const repository = {
        delete: jest.fn().mockResolvedValue({ affected }),
      } as unknown as Repository<ApplicationAnswerEntity>;
      const implementation = new ApplicationAnswerRepositoryImpl(repository);

      await expect(implementation.deleteByApplicationId('app1')).resolves.toBe(
        expected,
      );
      expect(repository.delete).toHaveBeenCalledWith({ applicationId: 'app1' });
    },
  );
});

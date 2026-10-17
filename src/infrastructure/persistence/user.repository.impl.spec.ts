import type { EntityManager, Repository } from 'typeorm';
import type { UserEntity } from '../database/orm/user.entity';
import {
  CandidateAvailability,
  CandidateSeniority,
  UserType,
} from '../../core/domain/enums';
import { UserRepositoryImpl } from './user.repository.impl';

describe('UserRepositoryImpl candidate filters', () => {
  it('adds declared facets, normalized skills, and inclusive experience bounds', async () => {
    const queryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      addOrderBy: jest.fn().mockReturnThis(),
      getCount: jest.fn().mockResolvedValue(0),
      getMany: jest.fn().mockResolvedValue([]),
    };
    const repository = {
      createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    } as unknown as Repository<UserEntity>;
    const userRepository = new UserRepositoryImpl(repository);

    await userRepository.findAll(
      {
        type: UserType.PROFESSIONAL,
        experienceLevel: CandidateSeniority.SENIOR,
        availability: CandidateAvailability.TWO_WEEKS,
        skills: ['  RNA   Seq  '],
        minExperience: 3,
        maxExperience: 8,
      },
      { page: 1, limit: 20 },
    );

    const whereCalls = queryBuilder.andWhere.mock.calls;
    expect(whereCalls).toContainEqual([
      'user.experienceLevel = :experienceLevel',
      { experienceLevel: CandidateSeniority.SENIOR },
    ]);
    expect(whereCalls).toContainEqual([
      'user.availability = :availability',
      { availability: CandidateAvailability.TWO_WEEKS },
    ]);
    expect(whereCalls).toContainEqual([
      expect.stringContaining('BTRIM(REGEXP_REPLACE(NORMALIZE('),
      { skills: ['rna seq'] },
    ]);
    expect(
      whereCalls.some(([query]) => String(query).includes('>= :minExperience')),
    ).toBe(true);
    expect(
      whereCalls.some(([query]) => String(query).includes('<= :maxExperience')),
    ).toBe(true);
    expect(
      whereCalls.some(([query]) =>
        String(query).includes('ORDER BY candidate_resume'),
      ),
    ).toBe(true);
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
      'resumes.updatedAt',
      'DESC',
    );
    expect(queryBuilder.addOrderBy).toHaveBeenCalledWith(
      'resumes.createdAt',
      'DESC',
    );
  });
});

describe('UserRepositoryImpl candidate updates', () => {
  it('locks the current row and rejects updates after candidate anonymization', async () => {
    const inactiveCandidate = {
      id: 'candidate-id',
      type: UserType.PROFESSIONAL,
      isActive: false,
    } as UserEntity;
    const findOne = jest.fn().mockResolvedValue(inactiveCandidate);
    const save = jest.fn();
    const manager = {
      getRepository: jest.fn().mockReturnValue({ findOne, save }),
    } as unknown as EntityManager;
    const transaction = jest.fn(
      (operation: (manager: EntityManager) => Promise<unknown>) =>
        operation(manager),
    );
    const repository = {
      manager: { transaction },
    } as unknown as Repository<UserEntity>;
    const userRepository = new UserRepositoryImpl(repository);

    await expect(
      userRepository.update('candidate-id', { name: 'Stale profile' }),
    ).resolves.toBeNull();

    expect(findOne).toHaveBeenCalledWith({
      where: { id: 'candidate-id' },
      lock: { mode: 'pessimistic_write' },
    });
    expect(save).not.toHaveBeenCalled();
  });
});

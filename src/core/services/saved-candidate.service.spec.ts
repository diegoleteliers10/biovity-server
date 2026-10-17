import { BadRequestException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { UserEntity } from '../../infrastructure/database/orm/user.entity';
import { UserType } from '../domain/enums';
import { SavedCandidateService } from './saved-candidate.service';

const organizationId = '55555555-5555-4555-8555-555555555555';
const candidateId = '22222222-2222-4222-8222-222222222222';

describe('SavedCandidateService', () => {
  const repository = {
    find: jest.fn(),
    count: jest.fn(),
  };
  const candidateRepository = {
    findOne: jest.fn(),
  };
  const savedCandidateRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
    createQueryBuilder: jest.fn(),
  };
  const insertQueryBuilder = {
    insert: jest.fn(),
    values: jest.fn(),
    orIgnore: jest.fn(),
    execute: jest.fn(),
  };
  const manager = {
    getRepository: (entity: unknown): unknown =>
      entity === UserEntity ? candidateRepository : savedCandidateRepository,
  };
  const transaction = jest.fn(
    (
      callback: (manager: {
        getRepository: (entity: unknown) => unknown;
      }) => unknown,
    ) => callback(manager),
  );
  const dataSource = {
    transaction,
  };
  const service = new SavedCandidateService(
    repository as never,
    dataSource as unknown as DataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    repository.find.mockResolvedValue([]);
    repository.count.mockResolvedValue(0);
    candidateRepository.findOne.mockReset();
    savedCandidateRepository.findOne.mockReset();
    candidateRepository.findOne.mockResolvedValue({
      id: candidateId,
      type: UserType.PROFESSIONAL,
      isActive: true,
    });
    savedCandidateRepository.findOne
      .mockResolvedValueOnce(null)
      .mockResolvedValue({ organizationId, candidateId, note: 'Review' });
    savedCandidateRepository.save.mockResolvedValue({
      organizationId,
      candidateId,
      note: 'Review',
    });
    savedCandidateRepository.createQueryBuilder.mockReturnValue(
      insertQueryBuilder,
    );
    insertQueryBuilder.insert.mockReturnValue(insertQueryBuilder);
    insertQueryBuilder.values.mockReturnValue(insertQueryBuilder);
    insertQueryBuilder.orIgnore.mockReturnValue(insertQueryBuilder);
    insertQueryBuilder.execute.mockResolvedValue(undefined);
  });

  it('lists and counts only active professionals', async () => {
    const where = {
      organizationId,
      candidate: { type: UserType.PROFESSIONAL, isActive: true },
    };

    await service.findByOrganization(organizationId);

    expect(repository.find).toHaveBeenCalledWith({
      where,
      relations: { candidate: true },
      order: { createdAt: 'DESC' },
      take: 20,
      skip: 0,
    });
    expect(repository.count).toHaveBeenCalledWith({ where });
  });

  it('locks and saves an active professional inside one transaction', async () => {
    const result = await service.save(organizationId, candidateId, 'Review');

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(candidateRepository.findOne).toHaveBeenCalledWith({
      where: { id: candidateId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(insertQueryBuilder.values).toHaveBeenCalledWith({
      organizationId,
      candidateId,
      note: 'Review',
    });
    expect(insertQueryBuilder.orIgnore).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ organizationId, candidateId, note: 'Review' });
  });

  it('rejects a missing candidate before writing', async () => {
    candidateRepository.findOne.mockResolvedValue(null);

    await expect(
      service.save(organizationId, candidateId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(savedCandidateRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it.each([
    { type: UserType.ORGANIZATION, isActive: true },
    { type: UserType.PROFESSIONAL, isActive: false },
  ])('rejects an ineligible candidate: $type, active=$isActive', async user => {
    candidateRepository.findOne.mockResolvedValue({ id: candidateId, ...user });

    await expect(
      service.save(organizationId, candidateId),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(savedCandidateRepository.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('keeps an existing saved candidate idempotent', async () => {
    const existing = { organizationId, candidateId, note: 'Existing' };
    savedCandidateRepository.findOne.mockResolvedValue(existing);

    await expect(service.save(organizationId, candidateId)).resolves.toBe(
      existing,
    );
    expect(savedCandidateRepository.save).not.toHaveBeenCalled();
  });

  it('preserves database errors from the insert', async () => {
    const databaseError = new Error('Database unavailable');
    savedCandidateRepository.findOne.mockReset().mockResolvedValue(null);
    insertQueryBuilder.execute.mockRejectedValue(databaseError);

    await expect(service.save(organizationId, candidateId)).rejects.toBe(
      databaseError,
    );
  });
});

import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { UserType } from '../domain/enums';
import { CandidateTagAssignmentEntity } from '../../infrastructure/database/orm/candidate-tag-assignment.entity';
import { CandidateTagEntity } from '../../infrastructure/database/orm/candidate-tag.entity';
import { UserEntity } from '../../infrastructure/database/orm/user.entity';
import { CandidateTagService } from './candidate-tag.service';

describe('CandidateTagService', () => {
  const tag = { id: 'tag-id' } as CandidateTagEntity;
  const assignmentRepository = {
    create: jest.fn((value: Partial<CandidateTagAssignmentEntity>) => value),
    findOne: jest.fn(),
    save: jest.fn(),
  };
  const candidateRepository = {
    findOne: jest.fn(),
  };
  const tagRepository = {
    findOne: jest.fn(),
  };
  const manager = {
    getRepository: jest.fn((entity: unknown) => {
      if (entity === CandidateTagEntity) return tagRepository;
      if (entity === UserEntity) return candidateRepository;
      return assignmentRepository;
    }),
  } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(
      (operation: (manager: EntityManager) => Promise<unknown>) =>
        operation(manager),
    ),
  } as unknown as DataSource;

  const service = new CandidateTagService(
    tagRepository as unknown as Repository<CandidateTagEntity>,
    assignmentRepository as unknown as Repository<CandidateTagAssignmentEntity>,
    dataSource,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tagRepository.findOne.mockResolvedValue(tag);
    assignmentRepository.findOne.mockResolvedValue(null);
  });

  it.each([
    ['organization', UserType.ORGANIZATION, true],
    ['inactive professional', UserType.PROFESSIONAL, false],
  ])('rejects an %s before saving an assignment', async (_, type, isActive) => {
    candidateRepository.findOne.mockResolvedValue({
      id: 'candidate-id',
      type,
      isActive,
    });

    await expect(service.assign('tag-id', 'candidate-id')).rejects.toThrow(
      BadRequestException,
    );
    expect(assignmentRepository.save).not.toHaveBeenCalled();
  });
});

import type { EntityManager, Repository } from 'typeorm';
import { Resume } from '../../core/domain/entities/resume.entity';
import type { ResumeEntity } from '../database/orm/resume.entity';
import { ResumeRepositoryImpl } from './resume.repository.impl';

const makeHarness = (existingResume?: Partial<ResumeEntity>) => {
  const operations: string[] = [];
  const resumeRepository = {
    save: jest.fn(async (resume: ResumeEntity) => {
      operations.push('save');
      return resume;
    }),
    findOne: jest.fn(async () => {
      operations.push('findOne');
      return existingResume ?? null;
    }),
    delete: jest.fn(async () => {
      operations.push('delete');
      return { affected: 1 };
    }),
  };
  const manager = {
    getRepository: jest.fn().mockReturnValue(resumeRepository),
    query: jest.fn(async () => {
      operations.push('snapshot');
      return [];
    }),
  } as unknown as EntityManager;
  const transaction = jest.fn(
    async <T>(operation: (manager: EntityManager) => Promise<T>) =>
      operation(manager),
  );
  const rootRepository = {
    manager: { transaction },
  } as unknown as Repository<ResumeEntity>;

  return {
    repository: new ResumeRepositoryImpl(rootRepository),
    manager,
    resumeRepository,
    transaction,
    operations,
  };
};

const resume = (skills: Resume['skills'], experiences: Resume['experiences']) =>
  new Resume('resume-id', 'candidate-id', undefined, experiences, [], skills);

describe('ResumeRepositoryImpl profile snapshots', () => {
  it('stores a snapshot in the resume creation transaction', async () => {
    const harness = makeHarness();

    await harness.repository.create(
      resume([{ name: 'PCR' }], [{ title: 'Researcher', startYear: '2020' }]),
    );

    expect(harness.transaction).toHaveBeenCalledTimes(1);
    expect(harness.resumeRepository.save).toHaveBeenCalledTimes(1);
    expect(harness.operations).toEqual(['save', 'snapshot']);
    expect(jest.mocked(harness.manager.query)).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO candidate_profile_change'),
      [expect.stringMatching(/^[0-9a-f-]{36}$/), 'candidate-id'],
    );
  });

  it('stores a snapshot only when searchable resume data changes', async () => {
    const existingResume = {
      id: 'resume-id',
      userId: 'candidate-id',
      skills: [{ name: 'PCR' }],
      experiences: [{ title: 'Researcher', startYear: '2020' }],
      education: [],
      certifications: [],
      languages: [],
      links: [],
      cvVersion: 0,
      createdAt: new Date('2026-01-01T00:00:00Z'),
      updatedAt: new Date('2026-01-01T00:00:00Z'),
    } satisfies Partial<ResumeEntity>;
    const harness = makeHarness(existingResume);

    await harness.repository.update('resume-id', {
      skills: [{ name: 'qPCR' }],
    });

    expect(harness.transaction).toHaveBeenCalledTimes(1);
    expect(harness.resumeRepository.save).toHaveBeenCalledTimes(1);
    expect(jest.mocked(harness.manager.query)).toHaveBeenCalledTimes(1);
    expect(jest.mocked(harness.manager.query).mock.calls[0]?.[1]).toEqual([
      expect.stringMatching(/^[0-9a-f-]{36}$/),
      'candidate-id',
    ]);
    expect(harness.operations).toEqual(['findOne', 'save', 'snapshot']);
  });

  it('does not store a snapshot for non-searchable resume changes', async () => {
    const harness = makeHarness({
      id: 'resume-id',
      userId: 'candidate-id',
      skills: ['PCR'],
      experiences: [{ title: 'Researcher', startYear: '2020' }],
    });

    await harness.repository.update('resume-id', {
      summary: 'Updated summary',
    });

    expect(jest.mocked(harness.manager.query)).not.toHaveBeenCalled();
    expect(harness.resumeRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'candidate-id',
        skills: ['PCR'],
        experiences: [{ title: 'Researcher', startYear: '2020' }],
      }),
    );
    expect(harness.operations).toEqual(['findOne', 'save']);
  });

  it('stores a snapshot in the resume deletion transaction', async () => {
    const harness = makeHarness({
      id: 'resume-id',
      userId: 'candidate-id',
      skills: [{ name: 'PCR' }],
      experiences: [{ title: 'Researcher', startYear: '2020' }],
    });

    await harness.repository.delete('resume-id');

    expect(harness.transaction).toHaveBeenCalledTimes(1);
    expect(harness.resumeRepository.delete).toHaveBeenCalledWith('resume-id');
    expect(harness.operations).toEqual(['findOne', 'delete', 'snapshot']);
    expect(jest.mocked(harness.manager.query)).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO candidate_profile_change'),
      [expect.stringMatching(/^[0-9a-f-]{36}$/), 'candidate-id'],
    );
  });

  it('rejects the transaction callback when snapshot insertion fails', async () => {
    const failure = new Error('snapshot insert failed');
    const harness = makeHarness();
    jest.mocked(harness.manager.query).mockRejectedValue(failure);

    await expect(
      harness.repository.create(
        resume([{ name: 'PCR' }], [{ title: 'Researcher', startYear: '2020' }]),
      ),
    ).rejects.toBe(failure);

    expect(harness.transaction).toHaveBeenCalledTimes(1);
    expect(harness.resumeRepository.save).toHaveBeenCalledTimes(1);
    expect(jest.mocked(harness.manager.query)).toHaveBeenCalledTimes(1);
  });
});

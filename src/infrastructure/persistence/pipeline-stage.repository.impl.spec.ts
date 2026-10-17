import { BadRequestException } from '@nestjs/common';
import { IsNull, Repository } from 'typeorm';
import { PipelineStageRepositoryImpl } from './pipeline-stage.repository.impl';
import { PipelineStageEntity } from '../database/orm/pipeline-stage.entity';

function setup() {
  const stages = [
    { id: 'first', jobId: 'job', name: 'First', order: 0 },
    { id: 'second', jobId: 'job', name: 'Second', order: 1 },
  ];
  const repository = {
    find: jest.fn().mockResolvedValue(stages),
    save: jest.fn().mockImplementation(value => Promise.resolve(value)),
  };
  const transaction = jest
    .fn()
    .mockImplementation(operation =>
      operation({ getRepository: () => repository }),
    );
  const service = new PipelineStageRepositoryImpl({
    manager: { transaction },
  } as unknown as Repository<PipelineStageEntity>);
  return { service, repository, transaction };
}
describe('Pipeline stage atomic reorder', () => {
  it.each([['first'], ['first', 'first'], ['first', 'foreign']])(
    'rejects an incomplete or foreign stage list %j',
    async (...ids) => {
      const { service, repository } = setup();
      await expect(service.reorder('job', ids)).rejects.toBeInstanceOf(
        BadRequestException,
      );
      expect(repository.save).not.toHaveBeenCalled();
    },
  );
  it('saves the full order in one transaction', async () => {
    const { service, repository, transaction } = setup();
    const result = await service.reorder('job', ['second', 'first']);
    expect(result.map(stage => stage.id)).toEqual(['second', 'first']);
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(repository.save).toHaveBeenCalledTimes(1);
    expect(repository.find).toHaveBeenCalledWith({
      where: { jobId: 'job' },
      lock: { mode: 'pessimistic_write' },
    });
  });
});

describe('Pipeline stage guarded update', () => {
  it('updates only active custom stages', async () => {
    const updatedStage = {
      id: 'custom',
      jobId: 'job',
      name: 'Renamed',
      order: 0,
      color: '#123456',
      statusProjection: 'pendiente',
      systemKey: null,
      isArchived: false,
    };
    const repository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(updatedStage),
    };
    const service = new PipelineStageRepositoryImpl(
      repository as unknown as Repository<PipelineStageEntity>,
    );

    await service.update('custom', { name: 'Renamed' });

    const [criteria] = repository.update.mock.calls[0];
    expect(criteria).toMatchObject({ id: 'custom', isArchived: false });
    expect(criteria.systemKey).toEqual(IsNull());
    expect(repository.findOne).toHaveBeenCalledWith({ where: { id: 'custom' } });
  });

  it('returns null when the stage changed before the conditional update', async () => {
    const repository = { update: jest.fn().mockResolvedValue({ affected: 0 }) };
    const service = new PipelineStageRepositoryImpl(
      repository as unknown as Repository<PipelineStageEntity>,
    );

    await expect(service.update('archived', { name: 'Renamed' })).resolves.toBeNull();
  });
});

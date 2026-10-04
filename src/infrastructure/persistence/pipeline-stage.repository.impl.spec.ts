import { BadRequestException } from '@nestjs/common';
import { Repository } from 'typeorm';
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

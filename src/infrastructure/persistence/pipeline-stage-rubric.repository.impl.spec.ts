import { DataSource, EntityManager } from 'typeorm';
import { PipelineStageRubricRepositoryImpl } from './pipeline-stage-rubric.repository.impl';
import { GENERAL_INTERVIEW_ROLE } from '../../core/domain/entities/pipeline-stage-rubric';

describe('PipelineStageRubricRepositoryImpl', () => {
  it('serializes edits and points the stage at the new immutable version', async () => {
    const manager = {
      query: jest
        .fn()
        .mockResolvedValueOnce([{ id: 'stage-id' }])
        .mockResolvedValueOnce([{ version: 2 }])
        .mockResolvedValueOnce([
          {
            stage_id: 'stage-id',
            current_version_id: 'version-id',
            version: 2,
            roles: [GENERAL_INTERVIEW_ROLE],
            criteria: [
              {
                id: 'criterion-id',
                label: 'Técnica',
                description: null,
                roleIds: [],
              },
            ],
          },
        ])
        .mockResolvedValueOnce([]),
    };
    const dataSource = {
      transaction: jest.fn(
        async (work: (manager: EntityManager) => Promise<unknown>) =>
          work(manager as unknown as EntityManager),
      ),
    } as unknown as DataSource;
    const repository = new PipelineStageRubricRepositoryImpl(dataSource);

    await expect(
      repository.createVersion(
        'stage-id',
        [GENERAL_INTERVIEW_ROLE],
        [
          {
            id: 'criterion-id',
            label: 'Técnica',
            description: null,
            roleIds: [],
          },
        ],
      ),
    ).resolves.toMatchObject({
      current_version_id: 'version-id',
      version: 2,
      roles: [GENERAL_INTERVIEW_ROLE],
    });
    expect(manager.query).toHaveBeenCalledTimes(4);
    expect(manager.query.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(manager.query.mock.calls[3]?.[0]).toContain(
      'SET current_rubric_version_id',
    );
  });
});

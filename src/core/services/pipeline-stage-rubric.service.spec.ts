import { BadRequestException } from '@nestjs/common';
import type { IPipelineStageRubricRepository } from '../repositories/pipeline-stage-rubric.repository';
import { PipelineStageRubricService } from './pipeline-stage-rubric.service';
import { GENERAL_INTERVIEW_ROLE } from '../domain/entities/pipeline-stage-rubric';

describe('PipelineStageRubricService', () => {
  const rubrics = {
    findCurrent: jest.fn(),
    createVersion: jest.fn(),
  };
  const service = new PipelineStageRubricService(
    rubrics as unknown as IPipelineStageRubricRepository,
  );

  beforeEach(() => jest.resetAllMocks());

  it('trims each criterion before creating an immutable version', async () => {
    rubrics.createVersion.mockResolvedValue({
      stage_id: '11111111-1111-4111-8111-111111111111',
      current_version_id: '22222222-2222-4222-8222-222222222222',
      version: 1,
      roles: [GENERAL_INTERVIEW_ROLE],
      criteria: [],
    });

    await service.createVersion('11111111-1111-4111-8111-111111111111', {
      criteria: [{
        label: '  Diseño experimental  ',
        description: '  Evalúa controles.  ',
      }],
    });

    expect(rubrics.createVersion).toHaveBeenCalledWith(
      '11111111-1111-4111-8111-111111111111',
      [GENERAL_INTERVIEW_ROLE],
      [
        expect.objectContaining({
          label: 'Diseño experimental',
          description: 'Evalúa controles.',
          roleIds: [],
        }),
      ],
    );
  });

  it('rejects duplicate criterion labels', async () => {
    await expect(
      service.createVersion('11111111-1111-4111-8111-111111111111', { criteria: [
        { label: 'Diseño experimental' },
        { label: ' diseño experimental ' },
      ] }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(rubrics.createVersion).not.toHaveBeenCalled();
  });
});

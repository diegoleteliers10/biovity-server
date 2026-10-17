import { ForbiddenException } from '@nestjs/common';
import type { PipelineStageRubricService } from '../../../core/services/pipeline-stage-rubric.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { PipelineStageRubricController } from './pipeline-stage-rubric.controller';

describe('PipelineStageRubricController', () => {
  const requester: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'recruiter@example.com',
    type: 'organization',
    organizationId: '22222222-2222-4222-8222-222222222222',
  };
  const stageId = '44444444-4444-4444-8444-444444444444';
  const rubricInput = { criteria: [{ label: 'Communication' }] };
  const rubric = {
    stage_id: stageId,
    current_version_id: '55555555-5555-4555-8555-555555555555',
    version: 1,
    roles: [],
    criteria: [],
  };

  let rubrics: jest.Mocked<PipelineStageRubricService>;
  let access: jest.Mocked<OrganizationAccessService>;
  let controller: PipelineStageRubricController;

  beforeEach(() => {
    rubrics = {
      findCurrent: jest.fn(),
      createVersion: jest.fn(),
    } as unknown as jest.Mocked<PipelineStageRubricService>;
    access = {
      assertPipelineStageAccess: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<OrganizationAccessService>;
    controller = new PipelineStageRubricController(rubrics, access);
  });

  it('blocks rubric reads before the service reads when stage ownership is denied', async () => {
    access.assertPipelineStageAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.getRubric(stageId, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(access.assertPipelineStageAccess).toHaveBeenCalledWith(
      stageId,
      requester,
      'read',
    );
    expect(rubrics.findCurrent).not.toHaveBeenCalled();
  });

  it('blocks rubric writes before the service writes when stage ownership is denied', async () => {
    access.assertPipelineStageAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.saveRubric(stageId, rubricInput, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(access.assertPipelineStageAccess).toHaveBeenCalledWith(
      stageId,
      requester,
      'manage',
    );
    expect(rubrics.createVersion).not.toHaveBeenCalled();
  });

  it('reads and saves rubrics after stage ownership checks', async () => {
    rubrics.findCurrent.mockResolvedValue(rubric);
    rubrics.createVersion.mockResolvedValue(rubric);

    await expect(controller.getRubric(stageId, requester)).resolves.toBe(
      rubric,
    );
    await expect(
      controller.saveRubric(stageId, rubricInput, requester),
    ).resolves.toBe(rubric);

    expect(access.assertPipelineStageAccess).toHaveBeenNthCalledWith(
      1,
      stageId,
      requester,
      'read',
    );
    expect(access.assertPipelineStageAccess).toHaveBeenNthCalledWith(
      2,
      stageId,
      requester,
      'manage',
    );
    expect(rubrics.findCurrent).toHaveBeenCalledWith(stageId);
    expect(rubrics.createVersion).toHaveBeenCalledWith(stageId, rubricInput);
  });
});

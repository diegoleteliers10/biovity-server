import { ForbiddenException } from '@nestjs/common';
import type { PipelineStage } from '../../../core/domain/entities/pipeline-stage.entity';
import type { PipelineStageService } from '../../../core/services/pipeline-stage.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { PipelineStageController } from './pipeline-stage.controller';

describe('PipelineStageController', () => {
  const requester: AuthenticatedUser = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'recruiter@example.com',
    type: 'organization',
    organizationId: '22222222-2222-4222-8222-222222222222',
  };
  const jobId = '33333333-3333-4333-8333-333333333333';
  const stageId = '44444444-4444-4444-8444-444444444444';
  const stage = {
    id: stageId,
    jobId,
    name: 'Review',
    order: 0,
    color: '#6366f1',
    statusProjection: 'pendiente',
    systemKey: null,
    isArchived: false,
  } as PipelineStage;

  let service: jest.Mocked<PipelineStageService>;
  let access: jest.Mocked<OrganizationAccessService>;
  let controller: PipelineStageController;

  beforeEach(() => {
    service = {
      create: jest.fn(),
      getById: jest.fn(),
      getByJobId: jest.fn(),
      update: jest.fn(),
      reorder: jest.fn(),
      delete: jest.fn(),
    } as unknown as jest.Mocked<PipelineStageService>;
    access = {
      assertJobAccess: jest.fn().mockResolvedValue(undefined),
      assertPipelineStageAccess: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<OrganizationAccessService>;
    controller = new PipelineStageController(service, access);
  });

  it.each([
    [
      'create',
      () => controller.create({ jobId, name: 'Review' }, requester),
      'job',
      'manage',
      'create',
    ],
    [
      'list by job',
      () => controller.getByJobId(jobId, requester),
      'job',
      'read',
      'getByJobId',
    ],
    [
      'read by id',
      () => controller.getById(stageId, requester),
      'stage',
      'read',
      'getById',
    ],
    [
      'update',
      () => controller.update(stageId, { name: 'Review' }, requester),
      'stage',
      'manage',
      'update',
    ],
    [
      'reorder',
      () => controller.reorder(jobId, { stageIds: [stageId] }, requester),
      'job',
      'manage',
      'reorder',
    ],
    [
      'delete',
      () => controller.delete(stageId, requester),
      'stage',
      'manage',
      'delete',
    ],
  ] as const)(
    '%s stops before service access when ownership is denied',
    async (_name, run, scope, permission, method) => {
      access.assertJobAccess.mockRejectedValue(new ForbiddenException());
      access.assertPipelineStageAccess.mockRejectedValue(
        new ForbiddenException(),
      );

      await expect(run()).rejects.toBeInstanceOf(ForbiddenException);

      if (scope === 'job') {
        expect(access.assertJobAccess).toHaveBeenCalledWith(
          jobId,
          requester,
          permission,
        );
      } else {
        expect(access.assertPipelineStageAccess).toHaveBeenCalledWith(
          stageId,
          requester,
          permission,
        );
      }
      expect(service[method]).not.toHaveBeenCalled();
    },
  );

  it('creates and reads stages after job ownership checks', async () => {
    service.create.mockResolvedValue(stage);
    service.getByJobId.mockResolvedValue([stage]);

    await expect(
      controller.create({ jobId, name: 'Review' }, requester),
    ).resolves.toMatchObject({ id: stageId, jobId, name: 'Review' });
    await expect(controller.getByJobId(jobId, requester)).resolves.toHaveLength(
      1,
    );

    expect(access.assertJobAccess).toHaveBeenNthCalledWith(
      1,
      jobId,
      requester,
      'manage',
    );
    expect(access.assertJobAccess).toHaveBeenNthCalledWith(
      2,
      jobId,
      requester,
      'read',
    );
    expect(service.create).toHaveBeenCalledWith({
      jobId,
      name: 'Review',
      order: 0,
      color: undefined,
      statusProjection: undefined,
    });
    expect(service.getByJobId).toHaveBeenCalledWith(jobId);
  });

  it('updates and reorders stages after ownership checks', async () => {
    service.update.mockResolvedValue(stage);
    service.reorder.mockResolvedValue([stage]);

    await expect(
      controller.update(stageId, { name: 'Review' }, requester),
    ).resolves.toMatchObject({ id: stageId });
    await expect(
      controller.reorder(jobId, { stageIds: [stageId] }, requester),
    ).resolves.toHaveLength(1);

    expect(access.assertPipelineStageAccess).toHaveBeenCalledWith(
      stageId,
      requester,
      'manage',
    );
    expect(access.assertJobAccess).toHaveBeenCalledWith(
      jobId,
      requester,
      'manage',
    );
    expect(service.update).toHaveBeenCalledWith(stageId, {
      name: 'Review',
      color: undefined,
    });
    expect(service.reorder).toHaveBeenCalledWith(jobId, [stageId]);
  });
});

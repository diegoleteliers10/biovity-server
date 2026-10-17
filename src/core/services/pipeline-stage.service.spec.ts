import { BadRequestException } from '@nestjs/common';
import { ApplicationStatus } from '../domain/enums';
import { PipelineStage } from '../domain/entities/pipeline-stage.entity';
import { PipelineStageService } from './pipeline-stage.service';

describe('PipelineStageService', () => {
  it('keeps built-in stages active for the fixed status API', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(
        new PipelineStage('stage-id', 'job-id', 'Rechazado', 4, '#f00', ApplicationStatus.RECHAZADO, ApplicationStatus.RECHAZADO),
      ),
      delete: jest.fn(),
    };
    const service = new PipelineStageService(repository as never);

    await expect(service.delete('stage-id')).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.delete).not.toHaveBeenCalled();
  });

  it.each([
    ['built-in', ApplicationStatus.PENDIENTE, false],
    ['archived', null, true],
  ])('rejects updates to %s stages', async (_label, systemKey, isArchived) => {
    const repository = {
      findById: jest.fn().mockResolvedValue(
        new PipelineStage('stage-id', 'job-id', 'Etapa', 0, '#f00', ApplicationStatus.PENDIENTE, systemKey, isArchived),
      ),
      update: jest.fn(),
    };
    const service = new PipelineStageService(repository as never);

    await expect(service.update('stage-id', { name: 'Cambiada' })).rejects.toBeInstanceOf(BadRequestException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('archives custom stages', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(
        new PipelineStage('stage-id', 'job-id', 'Evaluación'),
      ),
      delete: jest.fn().mockResolvedValue(true),
    };
    const service = new PipelineStageService(repository as never);

    await expect(service.delete('stage-id')).resolves.toBe(true);
    expect(repository.delete).toHaveBeenCalledWith('stage-id');
  });

  it('adds custom stages after all existing stages', async () => {
    const existing = [
      new PipelineStage('pending', 'job-id', 'Pendiente', 0),
      new PipelineStage('custom', 'job-id', 'Evaluación', 6),
    ];
    const repository = {
      findByJobId: jest.fn().mockResolvedValue(existing),
      create: jest.fn(async (stage: PipelineStage) => stage),
    };
    const service = new PipelineStageService(repository as never);

    const created = await service.create({
      jobId: 'job-id',
      name: 'Entrevista técnica',
      order: 0,
    });

    expect(created.order).toBe(7);
  });
});

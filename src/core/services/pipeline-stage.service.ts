import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IPipelineStageRepository } from '../repositories/pipeline-stage.repository';
import { PipelineStage } from '../domain/entities/pipeline-stage.entity';
import { CreatePipelineStageInput } from '../../shared/mappers/pipeline-stage/pipelineStageDto-domain.mapper';

@Injectable()
export class PipelineStageService {
  constructor(
    @Inject('IPipelineStageRepository')
    private readonly repository: IPipelineStageRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async create(data: CreatePipelineStageInput): Promise<PipelineStage> {
    const existingStages = await this.repository.findByJobId(data.jobId);
    const nextOrder = existingStages.reduce(
      (next, stage) => Math.max(next, stage.order + 1),
      0,
    );
    const stage = new PipelineStage(
      this.generateId(),
      data.jobId,
      data.name,
      Math.max(data.order, nextOrder),
      data.color,
      data.statusProjection,
    );
    return this.repository.create(stage);
  }

  async getById(id: string): Promise<PipelineStage | null> {
    return this.repository.findById(id);
  }

  async getByJobId(jobId: string): Promise<PipelineStage[]> {
    return this.repository.findByJobId(jobId);
  }

  async update(
    id: string,
    data: { name?: string; color?: string },
  ): Promise<PipelineStage | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Pipeline stage with id ${id} not found`);
    }
    if (existing.systemKey || existing.isArchived) {
      throw new BadRequestException('Built-in or archived stages cannot be updated');
    }
    const updated = await this.repository.update(id, data);
    if (!updated) {
      throw new BadRequestException('Built-in or archived stages cannot be updated');
    }
    return updated;
  }

  async reorder(jobId: string, stageIds: string[]): Promise<PipelineStage[]> {
    return this.repository.reorder(jobId, stageIds);
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Pipeline stage with id ${id} not found`);
    }
    if (existing.systemKey) {
      throw new BadRequestException('Built-in stages cannot be archived');
    }
    return this.repository.delete(id);
  }
}

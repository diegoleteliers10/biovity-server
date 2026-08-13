import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineStageEntity } from '../database/orm/pipeline-stage.entity';
import { PipelineStage } from '../../core/domain/entities/pipeline-stage.entity';
import { PipelineStageDomainOrmMapper } from '../../shared/mappers/pipeline-stage/pipelineStageDomain-orm.mapper';
import { IPipelineStageRepository } from '../../core/repositories/pipeline-stage.repository';

@Injectable()
export class PipelineStageRepositoryImpl implements IPipelineStageRepository {
  constructor(
    @InjectRepository(PipelineStageEntity)
    private readonly repository: Repository<PipelineStageEntity>,
  ) {}

  async create(entity: PipelineStage): Promise<PipelineStage> {
    const orm = PipelineStageDomainOrmMapper.toOrm(entity);
    const saved = await this.repository.save(orm);
    return PipelineStageDomainOrmMapper.toDomain(saved);
  }

  async findById(id: string): Promise<PipelineStage | null> {
    const orm = await this.repository.findOne({ where: { id } });
    return orm ? PipelineStageDomainOrmMapper.toDomain(orm) : null;
  }

  async findByJobId(jobId: string): Promise<PipelineStage[]> {
    const orms = await this.repository.find({
      where: { jobId },
      order: { order: 'ASC' },
    });
    return orms.map(orm => PipelineStageDomainOrmMapper.toDomain(orm));
  }

  async update(
    id: string,
    entity: Partial<PipelineStage>,
  ): Promise<PipelineStage | null> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) return null;

    const updated = {
      ...existing,
      ...PipelineStageDomainOrmMapper.toOrm(entity as PipelineStage),
    };
    const saved = await this.repository.save(updated);
    return PipelineStageDomainOrmMapper.toDomain(saved);
  }

  async reorder(jobId: string, stageIds: string[]): Promise<PipelineStage[]> {
    const stages = await this.repository.find({
      where: { jobId },
    });

    for (const stage of stages) {
      const newOrder = stageIds.indexOf(stage.id);
      if (newOrder !== -1) {
        stage.order = newOrder;
      }
    }

    const saved = await this.repository.save(stages);
    return saved.map(orm => PipelineStageDomainOrmMapper.toDomain(orm));
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

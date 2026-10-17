import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
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
      order: { isArchived: 'ASC', order: 'ASC' },
    });
    return orms.map(orm => PipelineStageDomainOrmMapper.toDomain(orm));
  }

  async update(
    id: string,
    entity: Partial<PipelineStage>,
  ): Promise<PipelineStage | null> {
    const result = await this.repository.update(
      { id, systemKey: IsNull(), isArchived: false },
      entity,
    );
    if (!result.affected) return null;
    return this.findById(id);
  }

  async reorder(jobId: string, stageIds: string[]): Promise<PipelineStage[]> {
    return this.repository.manager.transaction(async manager => {
      const repository = manager.getRepository(PipelineStageEntity);
      const stages = await repository.find({
        where: { jobId },
        lock: { mode: 'pessimistic_write' },
      });
      const activeStages = stages.filter(stage => !stage.isArchived);
      if (
        stageIds.length !== activeStages.length ||
        new Set(stageIds).size !== activeStages.length ||
        activeStages.some(stage => !stageIds.includes(stage.id))
      ) {
        return Promise.reject(
          new BadRequestException(
            'Include each stage of this job exactly once',
          ),
        );
      }
      const saved = await repository.save(
        activeStages.map(stage => ({ ...stage, order: stageIds.indexOf(stage.id) })),
      );
      return saved
        .sort((a, b) => a.order - b.order)
        .map(orm => PipelineStageDomainOrmMapper.toDomain(orm));
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.update({ id, isArchived: false }, { isArchived: true });
    return result.affected != null && result.affected > 0;
  }
}

import { PipelineStage } from '../../../core/domain/entities/pipeline-stage.entity';
import { PipelineStageEntity } from '../../../infrastructure/database/orm/pipeline-stage.entity';

export class PipelineStageDomainOrmMapper {
  static toOrm(domain: PipelineStage): PipelineStageEntity {
    const orm = new PipelineStageEntity();
    orm.id = domain.id;
    orm.jobId = domain.jobId;
    orm.name = domain.name;
    orm.order = domain.order;
    orm.color = domain.color;
    orm.statusProjection = domain.statusProjection;
    orm.systemKey = domain.systemKey;
    orm.isArchived = domain.isArchived;
    orm.currentRubricVersionId = null;
    return orm;
  }

  static toDomain(entity: PipelineStageEntity): PipelineStage {
    return new PipelineStage(
      entity.id,
      entity.jobId,
      entity.name,
      entity.order,
      entity.color,
      entity.statusProjection,
      entity.systemKey,
      entity.isArchived,
    );
  }
}

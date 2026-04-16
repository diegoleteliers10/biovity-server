import { JobQuestionEntity } from '../../../infrastructure/database/orm';
import { JobQuestion } from '../../../core/domain/entities/job-question.entity';

export class JobQuestionDomainOrmMapper {
  static toOrm(domain: JobQuestion): JobQuestionEntity {
    const entity = new JobQuestionEntity();
    entity.id = domain.id;
    entity.jobId = domain.jobId;
    entity.organizationId = domain.organizationId;
    entity.label = domain.label;
    entity.type = domain.type;
    entity.required = domain.required;
    entity.orderIndex = domain.orderIndex;
    entity.status = domain.status;
    entity.placeholder = domain.placeholder;
    entity.helperText = domain.helperText;
    entity.options = domain.options;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  static toDomain(entity: JobQuestionEntity): JobQuestion {
    return new JobQuestion(
      entity.id,
      entity.jobId,
      entity.organizationId,
      entity.label,
      entity.type,
      entity.required,
      entity.orderIndex,
      entity.status,
      entity.placeholder,
      entity.helperText,
      entity.options,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

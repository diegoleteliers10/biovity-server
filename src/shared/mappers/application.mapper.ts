import { Application } from '../../core/domain/entities/application.entity';
import { ApplicationEntity } from '../../infrastructure/database/orm/application.entity';

export class ApplicationMapper {
  static toDomain(entity: ApplicationEntity): Application {
    return new Application(
      entity.id,
      entity.jobId,
      entity.candidateId,
      entity.createdAt,
      entity.updatedAt,
      entity.status,
    );
  }

  static toEntity(domain: Application): ApplicationEntity {
    const entity = new ApplicationEntity();
    entity.id = domain.id;
    entity.jobId = domain.jobId;
    entity.candidateId = domain.candidateId;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    entity.status = domain.status;
    return entity;
  }
}

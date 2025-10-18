import { Application } from '../../../core/domain/entities/index';
import { ApplicationEntity } from '../../../infrastructure/database/orm/index';

export class ApplicationDomainOrmMapper {
  static toOrm(domain: Application): ApplicationEntity {
    const appOrm = new ApplicationEntity();
    appOrm.id = domain.id;
    appOrm.status = domain.status;
    appOrm.jobId = domain.jobId;
    appOrm.candidateId = domain.candidateId;
    appOrm.createdAt = domain.createdAt;
    appOrm.updatedAt = domain.updatedAt;

    return appOrm;
  }

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
}

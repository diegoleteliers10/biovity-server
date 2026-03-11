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
    const application = new Application(
      entity.id,
      entity.jobId,
      entity.candidateId,
      entity.createdAt,
      entity.updatedAt,
      entity.status,
    );

    // Map job relation if exists
    if (entity.job) {
      (application as any).job = {
        id: entity.job.id,
        title: entity.job.title,
        organizationId: entity.job.organizationId,
      };
    }

    // Map candidate relation if exists
    if (entity.candidate) {
      (application as any).candidate = {
        id: entity.candidate.id,
        name: entity.candidate.name,
        email: entity.candidate.email,
        avatar: entity.candidate.avatar,
        profession: entity.candidate.profession,
      };
    }

    return application;
  }
}

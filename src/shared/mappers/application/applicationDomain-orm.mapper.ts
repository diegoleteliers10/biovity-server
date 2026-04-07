import { Application } from '../../../core/domain/entities/index';
import { ApplicationEntity } from '../../../infrastructure/database/orm/index';

interface JobRelation {
  id: string;
  title: string;
  organizationId: string;
}

interface CandidateRelation {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  profession?: string;
}

export class ApplicationDomainOrmMapper {
  static toOrm(domain: Application): ApplicationEntity {
    const appOrm = new ApplicationEntity();
    appOrm.id = domain.id;
    appOrm.status = domain.status;
    appOrm.jobId = domain.jobId;
    appOrm.candidateId = domain.candidateId;
    appOrm.createdAt = domain.createdAt;
    appOrm.updatedAt = domain.updatedAt;
    appOrm.stageChangedAt = domain.stageChangedAt;

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
      entity.stageChangedAt,
    );

    // Map job relation if exists
    const job = entity.job as JobRelation | undefined;
    if (job) {
      (application as unknown as { job: JobRelation }).job = {
        id: job.id,
        title: job.title,
        organizationId: job.organizationId,
      };
    }

    // Map candidate relation if exists
    const candidate = entity.candidate as CandidateRelation | undefined;
    if (candidate) {
      (application as unknown as { candidate: CandidateRelation }).candidate = {
        id: candidate.id,
        name: candidate.name,
        email: candidate.email,
        avatar: candidate.avatar,
        profession: candidate.profession,
      };
    }

    return application;
  }
}

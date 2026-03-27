import { SavedJob } from '../../../core/domain/entities/saved-job.entity';
import { SavedJobEntity } from '../../../infrastructure/database/orm/saved-job.entity';

export class SavedJobDomainOrmMapper {
  static toOrm(domain: SavedJob): SavedJobEntity {
    const savedJobOrm = new SavedJobEntity();
    savedJobOrm.id = domain.id;
    savedJobOrm.userId = domain.userId;
    savedJobOrm.jobId = domain.jobId;
    savedJobOrm.createdAt = domain.createdAt;
    return savedJobOrm;
  }

  static toDomain(entity: SavedJobEntity): SavedJob {
    const savedJob = new SavedJob(
      entity.id,
      entity.userId,
      entity.jobId,
      entity.createdAt,
    );

    // Map job relation if exists
    if (entity.job) {
      (savedJob as any).job = {
        id: entity.job.id,
        title: entity.job.title,
        organizationId: entity.job.organizationId,
        status: entity.job.status,
      };
    }

    return savedJob;
  }
}

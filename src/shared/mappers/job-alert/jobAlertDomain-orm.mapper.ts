import { JobAlert } from '../../../core/domain/entities/job-alert.entity';
import { JobAlertEntity } from '../../../infrastructure/database/orm/job-alert.entity';

export class JobAlertDomainOrmMapper {
  static toOrm(domain: JobAlert): JobAlertEntity {
    const orm = new JobAlertEntity();
    orm.id = domain.id;
    orm.userId = domain.userId;
    orm.keywords = domain.keywords;
    orm.location = domain.location;
    orm.category = domain.category;
    orm.frequency = domain.frequency;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }

  static toDomain(entity: JobAlertEntity): JobAlert {
    return new JobAlert(
      entity.id,
      entity.userId,
      entity.keywords,
      entity.location,
      entity.category,
      entity.frequency,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

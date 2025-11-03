import { Session } from '../../../core/domain/entities/session.entity';
import { SessionEntity } from '../../../infrastructure/database/orm/session.entity';
import { UserDomainOrmMapper } from '../user/userDomain-orm.mapper';

export class SessionDomainOrmMapper {
  static toOrm(domain: Session): SessionEntity {
    const sessionOrm = new SessionEntity();
    sessionOrm.id = domain.id;
    sessionOrm.expiresAt = domain.expiresAt;
    sessionOrm.token = domain.token;
    sessionOrm.userId = domain.userId;
    sessionOrm.ipAddress = domain.ipAddress;
    sessionOrm.userAgent = domain.userAgent;
    sessionOrm.customField = domain.customField;
    sessionOrm.createdAt = domain.createdAt;
    sessionOrm.updatedAt = domain.updatedAt;

    // Convert user if it exists
    if (domain.user) {
      sessionOrm.user = UserDomainOrmMapper.toOrm(domain.user);
    }

    return sessionOrm;
  }

  static toDomain(entity: SessionEntity): Session {
    return new Session(
      entity.id,
      entity.expiresAt,
      entity.token,
      entity.userId,
      entity.ipAddress,
      entity.userAgent,
      entity.customField,
      entity.user ? UserDomainOrmMapper.toDomain(entity.user) : undefined,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

// domain-orm.mapper.ts
import { User } from '../../../core/domain/entities/index';
import { UserEntity } from '../../../infrastructure/database/orm/index';
import { OrganizationDomainOrmMapper } from '../../mappers/organization/organizationDomain-orm.mapper';

export class UserDomainOrmMapper {
  static toOrm(domain: User): UserEntity {
    const userOrm = new UserEntity();
    userOrm.id = domain.id;
    userOrm.email = domain.email;
    userOrm.name = domain.name;
    userOrm.password = domain.password;
    userOrm.type = domain.type;
    userOrm.isEmailVerified = domain.isEmailVerified;
    userOrm.isActive = domain.isActive;
    userOrm.verificationToken = domain.verificationToken;

    // Convert organization if it exists
    if (domain.organization) {
      userOrm.organization = OrganizationDomainOrmMapper.toOrm(
        domain.organization,
      );
    }

    return userOrm;
  }

  static toDomain(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.name,
      entity.password,
      entity.type,
      entity.isEmailVerified,
      entity.isActive,
      entity.verificationToken,
      entity.organization
        ? OrganizationDomainOrmMapper.toDomain(entity.organization)
        : undefined,
    );
  }
}

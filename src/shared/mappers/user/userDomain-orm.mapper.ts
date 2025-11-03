import { User } from '../../../core/domain/entities/index';
import { UserEntity } from '../../../infrastructure/database/orm/index';
import { OrganizationDomainOrmMapper } from '../organization/organizationDomain-orm.mapper';

export class UserDomainOrmMapper {
  static toOrm(domain: User): UserEntity {
    const userOrm = new UserEntity();
    userOrm.id = domain.id;
    userOrm.email = domain.email;
    userOrm.name = domain.name;
    userOrm.type = domain.type;
    userOrm.isEmailVerified = domain.isEmailVerified;
    userOrm.isActive = domain.isActive;
    userOrm.verificationToken = domain.verificationToken;
    userOrm.avatar = domain.avatar;
    userOrm.createdAt = domain.createdAt;
    userOrm.updatedAt = domain.updatedAt;

    // Convert organization if it exists
    if (domain.organization) {
      userOrm.organization = OrganizationDomainOrmMapper.toOrm(
        domain.organization,
      );
    }

    return userOrm;
  }

  static toOrmWithPassword(domain: User, hashedPassword: string): UserEntity {
    const userOrm = this.toOrm(domain);
    userOrm.password = hashedPassword;
    return userOrm;
  }

  static toDomain(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.name,
      entity.type,
      entity.isEmailVerified,
      entity.isActive,
      entity.verificationToken,
      entity.organization
        ? OrganizationDomainOrmMapper.toDomain(entity.organization)
        : undefined,
      entity.createdAt,
      entity.updatedAt,
      entity.avatar,
    );
  }
}

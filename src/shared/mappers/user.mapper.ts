import { User } from '../../core/domain/entities/user.entity';
import { UserEntity } from '../../infrastructure/database/orm/user.entity';

export class UserMapper {
  static toDomain(entity: UserEntity): User {
    return new User(
      entity.id,
      entity.email,
      entity.name,
      entity.type,
      entity.isEmailVerified,
      entity.isActive,
      entity.verificationToken,
      entity.organization,
    );
  }

  static toEntity(domain: User): UserEntity {
    const entity = new UserEntity();
    entity.id = domain.id;
    entity.email = domain.email;
    entity.name = domain.name;
    entity.type = domain.type;
    entity.isEmailVerified = domain.isEmailVerified;
    entity.isActive = domain.isActive;
    entity.verificationToken = domain.verificationToken;
    return entity;
  }
}

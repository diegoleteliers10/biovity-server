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
    userOrm.organizationId = domain.organizationId;
    userOrm.avatar = domain.avatar;
    userOrm.profession = domain.profession;
    userOrm.birthday = domain.birthday;
    userOrm.phone = domain.phone;
    userOrm.location = domain.location;
    userOrm.notificationPreferences = domain.notificationPreferences;
    userOrm.profileViews = domain.profileViews;
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

  static toDomain(entity: UserEntity): User {
    let skills: string[] | undefined = undefined;
    let cvUpdatedAt: Date | undefined = undefined;

    if (entity.resumes && entity.resumes.length > 0) {
      const resume = entity.resumes[0];
      if (resume.skills) {
        skills = resume.skills.map(s => typeof s === 'string' ? s : (s as any).name);
      }
      if (resume.updatedAt && resume.createdAt) {
        const isUpdated = new Date(resume.updatedAt).getTime() - new Date(resume.createdAt).getTime() > 5000;
        if (isUpdated) {
          cvUpdatedAt = resume.updatedAt;
        }
      }
    }

    return new User(
      entity.id,
      entity.email,
      entity.name,
      entity.type,
      entity.isEmailVerified,
      entity.isActive,
      entity.verificationToken,
      entity.organizationId ?? undefined,
      entity.organization
        ? OrganizationDomainOrmMapper.toDomain(entity.organization)
        : undefined,
      entity.createdAt,
      entity.updatedAt,
      entity.avatar,
      entity.profession,
      entity.birthday,
      entity.phone,
      entity.location,
      entity.profileViews,
      entity.notificationPreferences,
      skills,
      cvUpdatedAt,
    );
  }
}

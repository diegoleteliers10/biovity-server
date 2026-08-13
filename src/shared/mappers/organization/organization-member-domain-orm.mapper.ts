import { OrganizationMember } from '../../../core/domain/entities/organization-member.entity';
import { OrganizationEntity } from '../../../infrastructure/database/orm/organization.entity';
import { OrganizationMemberEntity } from '../../../infrastructure/database/orm/organization-member.entity';
import { OrganizationDomainOrmMapper } from './organizationDomain-orm.mapper';
import { UserDomainOrmMapper } from '../user/userDomain-orm.mapper';

export class OrganizationMemberDomainOrmMapper {
  static toOrm(domain: OrganizationMember): OrganizationMemberEntity {
    const orm = new OrganizationMemberEntity();
    orm.id = domain.id;
    orm.organizationId = domain.organizationId;
    orm.userId = domain.userId;
    orm.role = domain.role;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }

  static toDomain(entity: OrganizationMemberEntity): OrganizationMember {
    const member = new OrganizationMember(
      entity.id,
      entity.organizationId,
      entity.userId,
      entity.role,
      entity.createdAt,
      entity.updatedAt,
    );
    if (entity.organization) {
      member.organization = OrganizationDomainOrmMapper.toDomain(
        entity.organization,
      );
    }
    if (entity.user) {
      member.user = UserDomainOrmMapper.toDomain(entity.user);
    }
    return member;
  }
}

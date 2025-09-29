import { Organization } from '../../core/domain/entities/organization.entity';
import { OrganizationEntity } from '../../infrastructure/database/orm/organization.entity';

export class OrganizationMapper {
  static toDomain(entity: OrganizationEntity): Organization {
    return new Organization(
      entity.id,
      entity.name,
      entity.website,
      entity.phone,
      entity.address,
      entity.subscription,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  static toEntity(domain: Organization): OrganizationEntity {
    const entity = new OrganizationEntity();
    entity.id = domain.id;
    entity.name = domain.name;
    entity.website = domain.website;
    entity.phone = domain.phone;
    entity.address = domain.address;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}

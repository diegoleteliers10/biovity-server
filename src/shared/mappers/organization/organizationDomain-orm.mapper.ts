import { Organization } from '../../../core/domain/entities/index';
import { OrganizationEntity } from '../../../infrastructure/database/orm/index';

// src/shared/mappers/organization/organization-domain-orm.mapper.ts
export class OrganizationDomainOrmMapper {
  static toOrm(domain: Organization): OrganizationEntity {
    const orgOrm = new OrganizationEntity();
    orgOrm.id = domain.id;
    orgOrm.name = domain.name;
    orgOrm.website = domain.website;
    orgOrm.phone = domain.phone;
    orgOrm.address = domain.address;
    orgOrm.createdAt = domain.createdAt;
    orgOrm.updatedAt = domain.updatedAt;
    orgOrm.jobs = [];

    if (domain.subscription) {
      orgOrm.subscription = domain.subscription;
    }

    return orgOrm;
  }

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
}

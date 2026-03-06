import { Organization } from '../../../core/domain/entities/index';
import { OrganizationEntity } from '../../../infrastructure/database/orm/index';

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
    orgOrm.subscriptionId = domain.subscriptionId;
    orgOrm.jobs = [];

    return orgOrm;
  }

  static toDomain(entity: OrganizationEntity): Organization {
    return new Organization(
      entity.id,
      entity.name,
      entity.website,
      entity.phone,
      entity.address,
      entity.createdAt,
      entity.updatedAt,
      entity.subscriptionId,
    );
  }
}

import { Organization } from '../domain/entities/index';

export interface OrganizationPagination {
  take?: number;
  skip?: number;
}

export interface IOrganizationRepository {
  create(entity: Organization): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findAll(pagination?: OrganizationPagination): Promise<Organization[]>;
  update(
    id: string,
    entity: Partial<Organization>,
  ): Promise<Organization | null>;
  updateSubscription(
    organizationId: string,
    subscriptionId: string,
  ): Promise<Organization | null>;
  delete(id: string): Promise<boolean>;
}

import { Organization } from '../domain/entities/index';

export interface IOrganizationRepository {
  create(entity: Organization): Promise<Organization>;
  findById(id: string): Promise<Organization | null>;
  findAll(): Promise<Organization[]>;
  update(
    id: string,
    entity: Partial<Organization>,
  ): Promise<Organization | null>;
  delete(id: string): Promise<boolean>;
}

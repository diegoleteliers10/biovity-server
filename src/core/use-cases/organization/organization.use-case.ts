import { Organization } from '../../domain/entities/organization.entity';

export interface IOrganizationUseCase {
  createOrganization(data: CreateOrganizationInput): Promise<Organization>;
  getOrganizationById(id: string): Promise<Organization | null>;
  getAllOrganizations(): Promise<Organization[]>;
  updateOrganization(
    id: string,
    data: UpdateOrganizationInput,
  ): Promise<Organization | null>;
  deleteOrganization(id: string): Promise<boolean>;
}

export interface CreateOrganizationInput {
  name: string;
  website: string;
  phone?: string;
  address?: Record<string, unknown>;
}

export interface UpdateOrganizationInput {
  name?: string;
  website?: string;
  phone?: string;
  address?: Record<string, unknown>;
  subscriptionId?: string;
}

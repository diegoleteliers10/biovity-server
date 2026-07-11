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
  transferOwnership(organizationId: string, newOwnerUserId: string): Promise<Organization>;
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
  integrations?: {
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
    enabled?: boolean;
  };
  logo?: string;
  description?: string;
  industry?: string;
  size?: string;
}

import { OrganizationMember } from '../domain/entities/organization-member.entity';

export interface OrganizationMemberPagination {
  take?: number;
  skip?: number;
}

export interface IOrganizationMemberRepository {
  create(entity: OrganizationMember): Promise<OrganizationMember>;
  findById(id: string): Promise<OrganizationMember | null>;
  findByOrganization(
    organizationId: string,
    pagination?: OrganizationMemberPagination,
  ): Promise<OrganizationMember[]>;
  findByUser(userId: string): Promise<OrganizationMember[]>;
  findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null>;
  update(
    id: string,
    entity: Partial<OrganizationMember>,
  ): Promise<OrganizationMember | null>;
  delete(id: string): Promise<boolean>;
}

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IOrganizationRepository } from '../repositories/organization.repository';
import { IOrganizationMemberRepository } from '../repositories/organization-member.repository';
import {
  IOrganizationUseCase,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../use-cases/organization/organization.use-case';
import { Organization } from '../domain/entities/organization.entity';
import {
  parsePagination,
  paginated,
  type PaginatedResponse,
  type PaginationQuery,
} from '../../shared/pagination/pagination';

@Injectable()
export class OrganizationService implements IOrganizationUseCase {
  constructor(
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    @Inject('IOrganizationMemberRepository')
    private readonly memberRepository: IOrganizationMemberRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  private slugify(name: string): string {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 60)
      .replace(/-+$/g, '');
    return base || 'empresa';
  }

  private async generateUniqueSlug(name: string): Promise<string> {
    const base = this.slugify(name);
    for (let n = 1; n <= 100; n += 1) {
      const candidate = n === 1 ? base : `${base}-${n}`;
      const taken = await this.organizationRepository.findBySlug(candidate);
      if (!taken) return candidate;
    }
    return `${base}-${crypto.randomUUID().slice(0, 8)}`;
  }

  async createOrganization(
    data: CreateOrganizationInput,
    ownerUserId: string,
  ): Promise<Organization> {
    const organization = new Organization(
      this.generateId(),
      data.name,
      data.website,
      data.phone,
      data.address,
      new Date(),
      new Date(),
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      await this.generateUniqueSlug(data.name),
    );

    return this.organizationRepository.createWithOwner(
      organization,
      ownerUserId,
    );
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    return this.organizationRepository.findById(id);
  }

  async getAllOrganizations(
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<Organization>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [organizations, total] = await Promise.all([
      this.organizationRepository.findAll({ take: limit, skip }),
      this.organizationRepository.count(),
    ]);
    return paginated(organizations, total, page, limit);
  }

  async updateOrganization(
    id: string,
    data: UpdateOrganizationInput,
  ): Promise<Organization | null> {
    const existingOrganization = await this.organizationRepository.findById(id);
    if (!existingOrganization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }

    const updatedOrganization: Partial<Organization> = {
      ...existingOrganization,
      name: data.name ?? existingOrganization.name,
      website: data.website ?? existingOrganization.website,
      phone: data.phone ?? existingOrganization.phone,
      address: data.address ?? existingOrganization.address,
      subscriptionId:
        data.subscriptionId ?? existingOrganization.subscriptionId,
      integrations: data.integrations ?? existingOrganization.integrations,
      logo: data.logo ?? existingOrganization.logo,
      description: data.description ?? existingOrganization.description,
      industry: data.industry ?? existingOrganization.industry,
      size: data.size ?? existingOrganization.size,
      foundedYear: data.foundedYear ?? existingOrganization.foundedYear,
      linkedinUrl: data.linkedinUrl ?? existingOrganization.linkedinUrl,
      twitterUrl: data.twitterUrl ?? existingOrganization.twitterUrl,
    };

    return this.organizationRepository.update(id, updatedOrganization);
  }

  async deleteOrganization(id: string): Promise<boolean> {
    const existingOrganization = await this.organizationRepository.findById(id);
    if (!existingOrganization) {
      throw new NotFoundException(`Organization with id ${id} not found`);
    }

    return this.organizationRepository.delete(id);
  }

  async transferOwnership(
    organizationId: string,
    currentOwnerUserId: string,
    newOwnerUserId: string,
  ): Promise<Organization> {
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      throw new NotFoundException(
        `Organization with id ${organizationId} not found`,
      );
    }

    // Verify the new owner is a member
    const member = await this.memberRepository.findByOrganizationAndUser(
      organizationId,
      newOwnerUserId,
    );
    if (!member) {
      throw new NotFoundException('User is not a member of this organization');
    }

    await this.organizationRepository.transferOwner(
      organizationId,
      currentOwnerUserId,
      newOwnerUserId,
    );
    const updated = await this.organizationRepository.findById(organizationId);
    if (!updated) {
      throw new NotFoundException(
        `Organization with id ${organizationId} not found`,
      );
    }
    return updated;
  }
}

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
import { OrganizationMemberRole } from '../domain/entities/organization-member.entity';

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

  async createOrganization(
    data: CreateOrganizationInput,
  ): Promise<Organization> {
    const organization = new Organization(
      this.generateId(),
      data.name,
      data.website,
      data.phone,
      data.address,
      new Date(),
      new Date(),
    );

    return this.organizationRepository.create(organization);
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
    return this.organizationRepository.findById(id);
  }

  async getAllOrganizations(): Promise<Organization[]> {
    return this.organizationRepository.findAll();
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

    // Update the new owner's role to admin
    await this.memberRepository.update(member.id, {
      role: OrganizationMemberRole.ADMIN,
    });

    const updated = await this.organizationRepository.findById(organizationId);
    if (!updated) {
      throw new NotFoundException(
        `Organization with id ${organizationId} not found`,
      );
    }
    return updated;
  }
}

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IOrganizationRepository } from '../repositories/organization.repository';
import {
  IOrganizationUseCase,
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../use-cases/organization/organization.use-case';
import { Organization } from '../domain/entities/organization.entity';

@Injectable()
export class OrganizationService implements IOrganizationUseCase {
  constructor(
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
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
}

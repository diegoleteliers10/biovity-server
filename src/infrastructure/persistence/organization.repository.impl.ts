import { IOrganizationRepository } from '../../core/repositories/organization.repository';
import { Injectable } from '@nestjs/common';
import { OrganizationEntity } from '../database/orm';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { UserEntity } from '../database/orm/user.entity';
import { Organization } from '../../core/domain/entities/organization.entity';
import { OrganizationDomainOrmMapper } from '../../shared/mappers/organization/organizationDomain-orm.mapper';
import { UserType } from '../../core/domain/enums';

@Injectable()
export class OrganizationRepositoryImpl implements IOrganizationRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {}

  async create(entity: Organization): Promise<Organization> {
    const organizationOrm = OrganizationDomainOrmMapper.toOrm(entity);
    const savedOrganization =
      await this.organizationRepository.save(organizationOrm);
    return OrganizationDomainOrmMapper.toDomain(savedOrganization);
  }

  async createWithOwner(
    entity: Organization,
    ownerUserId: string,
  ): Promise<Organization> {
    return this.dataSource.transaction(async manager => {
      const organizationOrm = OrganizationDomainOrmMapper.toOrm(entity);
      const savedOrganization = await manager.save(
        OrganizationEntity,
        organizationOrm,
      );
      const ownerUpdate = await manager.update(
        UserEntity,
        { id: ownerUserId },
        { organizationId: savedOrganization.id },
      );
      if (!ownerUpdate.affected)
        throw new NotFoundException('Organization owner not found');
      return OrganizationDomainOrmMapper.toDomain(savedOrganization);
    });
  }

  async transferOwner(
    organizationId: string,
    currentOwnerUserId: string,
    newOwnerUserId: string,
  ): Promise<void> {
    await this.dataSource.transaction(async manager => {
      const organizations = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM organization WHERE id = $1::uuid FOR UPDATE`,
        [organizationId],
      );
      if (!organizations[0])
        throw new NotFoundException('Organization not found');
      const currentOwners = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM "user" WHERE "organizationId" = $1::uuid FOR UPDATE`,
        [organizationId],
      );
      if (
        currentOwners.length !== 1 ||
        currentOwners[0].id !== currentOwnerUserId
      ) {
        throw new NotFoundException(
          'Current owner does not match this organization',
        );
      }
      const newOwner = await manager.findOne(UserEntity, {
        where: { id: newOwnerUserId },
      });
      if (!newOwner || newOwner.type !== UserType.ORGANIZATION) {
        throw new NotFoundException('New owner must be an organization user');
      }
      const membership = await manager.query<Array<{ id: string }>>(
        `SELECT id FROM organization_member
         WHERE organization_id = $1::uuid AND user_id = $2::uuid FOR UPDATE`,
        [organizationId, newOwnerUserId],
      );
      if (!membership[0])
        throw new NotFoundException(
          'New owner must be a member of this organization',
        );
      if (
        newOwner.organizationId &&
        newOwner.organizationId !== organizationId
      ) {
        throw new NotFoundException(
          'New owner already owns another organization',
        );
      }
      await manager.update(
        UserEntity,
        { id: currentOwnerUserId, organizationId },
        { organizationId: () => 'NULL' },
      );
      const ownerUpdate = await manager.update(
        UserEntity,
        { id: newOwnerUserId, type: UserType.ORGANIZATION },
        { organizationId },
      );
      if (!ownerUpdate.affected)
        throw new NotFoundException('Organization owner not found');
      await manager.query(
        `UPDATE organization_member SET role = 'admin', updated_at = NOW()
         WHERE organization_id = $1::uuid AND user_id = $2::uuid`,
        [organizationId, newOwnerUserId],
      );
      if (currentOwnerUserId !== newOwnerUserId) {
        await manager.query(
          `INSERT INTO organization_member (organization_id, user_id, role)
           VALUES ($1::uuid, $2::uuid, 'recruiter')
           ON CONFLICT (organization_id, user_id)
           DO UPDATE SET role = 'recruiter', updated_at = NOW()`,
          [organizationId, currentOwnerUserId],
        );
      }
    });
  }

  async findById(id: string): Promise<Organization | null> {
    const organizationOrm = await this.organizationRepository.findOne({
      where: { id },
    });
    return organizationOrm
      ? OrganizationDomainOrmMapper.toDomain(organizationOrm)
      : null;
  }

  async findAll(pagination?: {
    take?: number;
    skip?: number;
  }): Promise<Organization[]> {
    const organizationsOrm = await this.organizationRepository.find({
      take: pagination?.take ?? 50,
      skip: pagination?.skip ?? 0,
    });
    return organizationsOrm.map(organizationOrm =>
      OrganizationDomainOrmMapper.toDomain(organizationOrm),
    );
  }

  async count(): Promise<number> {
    return this.organizationRepository.count();
  }

  async update(
    id: string,
    entity: Partial<Organization>,
  ): Promise<Organization | null> {
    const existingOrganization = await this.organizationRepository.findOne({
      where: { id },
    });
    if (!existingOrganization) return null;

    const updatedOrganizationOrm = {
      ...existingOrganization,
      ...OrganizationDomainOrmMapper.toOrm(entity as Organization),
    };
    const savedOrganization = await this.organizationRepository.save(
      updatedOrganizationOrm,
    );
    return OrganizationDomainOrmMapper.toDomain(savedOrganization);
  }

  async updateSubscription(
    organizationId: string,
    subscriptionId: string,
  ): Promise<Organization | null> {
    const existingOrganization = await this.organizationRepository.findOne({
      where: { id: organizationId },
    });
    if (!existingOrganization) return null;

    existingOrganization.subscriptionId = subscriptionId;
    const savedOrganization =
      await this.organizationRepository.save(existingOrganization);
    return OrganizationDomainOrmMapper.toDomain(savedOrganization);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.organizationRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

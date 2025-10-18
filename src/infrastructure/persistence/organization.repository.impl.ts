import { IOrganizationRepository } from '../../core/repositories/organization.repository';
import { Injectable } from '@nestjs/common';
import { OrganizationEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Organization } from '../../core/domain/entities/organization.entity';
import { OrganizationDomainOrmMapper } from '../../shared/mappers/organization/organizationDomain-orm.mapper';

@Injectable()
export class OrganizationRepositoryImpl implements IOrganizationRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  async create(entity: Organization): Promise<Organization> {
    const organizationOrm = OrganizationDomainOrmMapper.toOrm(entity);
    const savedOrganization =
      await this.organizationRepository.save(organizationOrm);
    return OrganizationDomainOrmMapper.toDomain(savedOrganization);
  }

  async findById(id: string): Promise<Organization | null> {
    const organizationOrm = await this.organizationRepository.findOne({
      where: { id },
    });
    return organizationOrm
      ? OrganizationDomainOrmMapper.toDomain(organizationOrm)
      : null;
  }

  async findAll(): Promise<Organization[]> {
    const organizationsOrm = await this.organizationRepository.find();
    return organizationsOrm.map(organizationOrm =>
      OrganizationDomainOrmMapper.toDomain(organizationOrm),
    );
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

  async delete(id: string): Promise<boolean> {
    const result = await this.organizationRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

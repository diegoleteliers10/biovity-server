import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IOrganizationRepository } from '../../core/repositories/organization.repository';
import { Organization } from '../../core/domain/entities/organization.entity';
import { OrganizationEntity } from '../database/orm/organization.entity';
import { OrganizationMapper } from '../../shared/mappers/organization.mapper';

@Injectable()
export class OrganizationRepositoryImpl implements IOrganizationRepository {
  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
  ) {}

  async create(entity: Organization): Promise<Organization> {
    const organizationEntity = OrganizationMapper.toEntity(entity);
    const savedEntity =
      await this.organizationRepository.save(organizationEntity);
    return OrganizationMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<Organization | null> {
    const organizationEntity = await this.organizationRepository.findOne({
      where: { id },
      relations: ['subscription'],
    });
    return organizationEntity
      ? OrganizationMapper.toDomain(organizationEntity)
      : null;
  }

  async findAll(): Promise<Organization[]> {
    const organizationEntities = await this.organizationRepository.find({
      relations: ['subscription'],
    });
    return organizationEntities.map(entity =>
      OrganizationMapper.toDomain(entity),
    );
  }

  async update(
    id: string,
    entity: Partial<Organization>,
  ): Promise<Organization | null> {
    const existingEntity = await this.organizationRepository.findOne({
      where: { id },
    });

    if (!existingEntity) {
      return null;
    }

    const updatedEntity = { ...existingEntity, ...entity };
    const savedEntity = await this.organizationRepository.save(updatedEntity);
    return OrganizationMapper.toDomain(savedEntity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.organizationRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OrganizationMemberEntity } from '../database/orm/organization-member.entity';
import {
  IOrganizationMemberRepository,
  OrganizationMemberPagination,
} from '../../core/repositories/organization-member.repository';
import { OrganizationMember } from '../../core/domain/entities/organization-member.entity';
import { OrganizationMemberDomainOrmMapper } from '../../shared/mappers/organization/organization-member-domain-orm.mapper';

@Injectable()
export class OrganizationMemberRepositoryImpl implements IOrganizationMemberRepository {
  constructor(
    @InjectRepository(OrganizationMemberEntity)
    private readonly repo: Repository<OrganizationMemberEntity>,
  ) {}

  async create(entity: OrganizationMember): Promise<OrganizationMember> {
    const orm = OrganizationMemberDomainOrmMapper.toOrm(entity);
    const saved = await this.repo.save(orm);
    return OrganizationMemberDomainOrmMapper.toDomain(saved);
  }

  async findById(id: string): Promise<OrganizationMember | null> {
    const orm = await this.repo.findOne({
      where: { id },
      relations: ['user', 'organization'],
    });
    return orm ? OrganizationMemberDomainOrmMapper.toDomain(orm) : null;
  }

  async findByOrganization(
    organizationId: string,
    pagination?: OrganizationMemberPagination,
  ): Promise<OrganizationMember[]> {
    const orms = await this.repo.find({
      where: { organizationId },
      relations: ['user'],
      order: { createdAt: 'ASC' },
      take: pagination?.take ?? 50,
      skip: pagination?.skip ?? 0,
    });
    return orms.map(orm => OrganizationMemberDomainOrmMapper.toDomain(orm));
  }

  async findByUser(userId: string): Promise<OrganizationMember[]> {
    const orms = await this.repo.find({
      where: { userId },
      relations: ['organization'],
    });
    return orms.map(orm => OrganizationMemberDomainOrmMapper.toDomain(orm));
  }

  async findByOrganizationAndUser(
    organizationId: string,
    userId: string,
  ): Promise<OrganizationMember | null> {
    const orm = await this.repo.findOne({
      where: { organizationId, userId },
      relations: ['user', 'organization'],
    });
    return orm ? OrganizationMemberDomainOrmMapper.toDomain(orm) : null;
  }

  async update(
    id: string,
    entity: Partial<OrganizationMember>,
  ): Promise<OrganizationMember | null> {
    const existing = await this.repo.findOne({ where: { id } });
    if (!existing) return null;
    const updated = {
      ...existing,
      ...OrganizationMemberDomainOrmMapper.toOrm(entity as OrganizationMember),
    };
    const saved = await this.repo.save(updated);
    return OrganizationMemberDomainOrmMapper.toDomain(saved);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repo.delete(id);
    return (result.affected ?? 0) > 0;
  }
}

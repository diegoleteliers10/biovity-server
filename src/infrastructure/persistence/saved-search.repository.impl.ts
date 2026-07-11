import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SavedSearchEntity } from '../database/orm/saved-search.entity';
import { SavedSearch } from '../../core/domain/entities/saved-search.entity';
import { SavedSearchDomainOrmMapper } from '../../shared/mappers/saved-search/savedSearchDomain-orm.mapper';
import { ISavedSearchRepository } from '../../core/repositories/saved-search.repository';

@Injectable()
export class SavedSearchRepositoryImpl implements ISavedSearchRepository {
  constructor(
    @InjectRepository(SavedSearchEntity)
    private readonly repository: Repository<SavedSearchEntity>,
  ) {}

  async create(entity: SavedSearch): Promise<SavedSearch> {
    const orm = SavedSearchDomainOrmMapper.toOrm(entity);
    const saved = await this.repository.save(orm);
    return SavedSearchDomainOrmMapper.toDomain(saved);
  }

  async findById(id: string): Promise<SavedSearch | null> {
    const orm = await this.repository.findOne({
      where: { id },
      relations: ['organization'],
    });
    return orm ? SavedSearchDomainOrmMapper.toDomain(orm) : null;
  }

  async findByOrganizationId(organizationId: string): Promise<SavedSearch[]> {
    const orms = await this.repository.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
    return orms.map(orm => SavedSearchDomainOrmMapper.toDomain(orm));
  }

  async update(id: string, entity: Partial<SavedSearch>): Promise<SavedSearch | null> {
    const existing = await this.repository.findOne({ where: { id } });
    if (!existing) return null;

    const updated = { ...existing, ...SavedSearchDomainOrmMapper.toOrm(entity as SavedSearch) };
    const saved = await this.repository.save(updated);
    return SavedSearchDomainOrmMapper.toDomain(saved);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

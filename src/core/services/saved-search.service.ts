import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { ISavedSearchRepository } from '../repositories/saved-search.repository';
import { SavedSearch } from '../domain/entities/saved-search.entity';
import {
  CreateSavedSearchInput,
  UpdateSavedSearchInput,
} from '../../shared/mappers/saved-search/savedSearchDto-domain.mapper';

@Injectable()
export class SavedSearchService {
  constructor(
    @Inject('ISavedSearchRepository')
    private readonly repository: ISavedSearchRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async create(data: CreateSavedSearchInput): Promise<SavedSearch> {
    const savedSearch = new SavedSearch(
      this.generateId(),
      data.organizationId,
      data.name,
      data.filters ?? {},
      data.notifyEnabled ?? false,
      new Date(),
      new Date(),
    );
    return this.repository.create(savedSearch);
  }

  async getById(id: string): Promise<SavedSearch | null> {
    return this.repository.findById(id);
  }

  async getByOrganizationId(organizationId: string): Promise<SavedSearch[]> {
    return this.repository.findByOrganizationId(organizationId);
  }

  async update(
    id: string,
    data: UpdateSavedSearchInput,
  ): Promise<SavedSearch | null> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }
    return this.repository.update(id, {
      ...data,
      notifyEnabled: data.notifyEnabled ?? existing.notifyEnabled,
    });
  }

  async delete(id: string): Promise<boolean> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Saved search with id ${id} not found`);
    }
    return this.repository.delete(id);
  }
}

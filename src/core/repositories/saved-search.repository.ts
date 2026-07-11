import { SavedSearch } from '../domain/entities/saved-search.entity';

export interface ISavedSearchRepository {
  create(entity: SavedSearch): Promise<SavedSearch>;
  findById(id: string): Promise<SavedSearch | null>;
  findByOrganizationId(organizationId: string): Promise<SavedSearch[]>;
  update(id: string, entity: Partial<SavedSearch>): Promise<SavedSearch | null>;
  delete(id: string): Promise<boolean>;
}

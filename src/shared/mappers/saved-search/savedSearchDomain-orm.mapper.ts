import { SavedSearch } from '../../../core/domain/entities/saved-search.entity';
import { SavedSearchEntity } from '../../../infrastructure/database/orm/saved-search.entity';

export class SavedSearchDomainOrmMapper {
  static toOrm(domain: SavedSearch): SavedSearchEntity {
    const orm = new SavedSearchEntity();
    orm.id = domain.id;
    orm.organizationId = domain.organizationId;
    orm.name = domain.name;
    orm.filters = domain.filters;
    orm.notifyEnabled = domain.notifyEnabled;
    orm.createdAt = domain.createdAt;
    orm.updatedAt = domain.updatedAt;
    return orm;
  }

  static toDomain(entity: SavedSearchEntity): SavedSearch {
    return new SavedSearch(
      entity.id,
      entity.organizationId,
      entity.name,
      entity.filters,
      entity.notifyEnabled,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

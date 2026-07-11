import { SavedSearch } from '../../../core/domain/entities/saved-search.entity';
import { SavedSearchResponseDto } from '../../../interfaces/dtos/saved-search/saved-search-response.dto';

export class SavedSearchDomainDtoMapper {
  static toDto(domain: SavedSearch): SavedSearchResponseDto {
    return {
      id: domain.id,
      organizationId: domain.organizationId,
      name: domain.name,
      filters: domain.filters,
      notifyEnabled: domain.notifyEnabled,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
  }
}

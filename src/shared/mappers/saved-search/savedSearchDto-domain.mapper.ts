import { CreateSavedSearchDto } from '../../../interfaces/dtos/saved-search/create-saved-search.dto';
import { UpdateSavedSearchDto } from '../../../interfaces/dtos/saved-search/update-saved-search.dto';

export interface CreateSavedSearchInput {
  organizationId: string;
  name: string;
  filters?: Record<string, unknown>;
  notifyEnabled?: boolean;
}

export interface UpdateSavedSearchInput {
  name?: string;
  filters?: Record<string, unknown>;
  notifyEnabled?: boolean;
}

export class SavedSearchDtoDomainMapper {
  static toCreateInput(dto: CreateSavedSearchDto): CreateSavedSearchInput {
    return {
      organizationId: dto.organizationId,
      name: dto.name,
      filters: dto.filters,
      notifyEnabled: dto.notifyEnabled,
    };
  }

  static toUpdateInput(dto: UpdateSavedSearchDto): UpdateSavedSearchInput {
    return {
      name: dto.name,
      filters: dto.filters,
      notifyEnabled: dto.notifyEnabled,
    };
  }
}

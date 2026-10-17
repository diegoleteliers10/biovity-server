import { SavedSearch } from '../../../core/domain/entities/saved-search.entity';
import { SavedSearchDomainDtoMapper } from './savedSearchDomain-dto.mapper';

describe('SavedSearchDomainDtoMapper', () => {
  it.each([true, false])('returns notifyEnabled=%s', notifyEnabled => {
    const savedSearch = new SavedSearch(
      'search-id',
      'organization-id',
      'Bio roles',
      { profession: 'biologist' },
      notifyEnabled,
    );

    expect(SavedSearchDomainDtoMapper.toDto(savedSearch).notifyEnabled).toBe(
      notifyEnabled,
    );
  });
});

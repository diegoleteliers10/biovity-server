import { SavedSearchController } from './saved-search.controller';
import { SavedSearch } from '../../../core/domain/entities/saved-search.entity';
import type { SavedSearchService } from '../../../core/services/saved-search.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

describe('SavedSearchController', () => {
  it('keeps the execute GET read-only and returns notification settings', async () => {
    const savedSearch = new SavedSearch(
      'search-id',
      'organization-id',
      'Lab roles',
      { profession: 'biologist' },
      true,
    );
    const service = {
      getById: jest.fn(async () => savedSearch),
    } as unknown as SavedSearchService;
    const organizationAccess = {
      assertSavedSearchAccess: jest.fn(async () => undefined),
    } as unknown as OrganizationAccessService;
    const controller = new SavedSearchController(service, organizationAccess);

    const response = await controller.execute('search-id', {
      id: 'member-id',
      email: 'member@example.com',
      type: 'organization',
      organizationId: 'organization-id',
    });

    expect(organizationAccess.assertSavedSearchAccess).toHaveBeenCalledWith(
      'search-id',
      expect.objectContaining({ id: 'member-id' }),
      'manage',
    );
    expect(service.getById).toHaveBeenCalledWith('search-id');
    expect(response.notifyEnabled).toBe(true);
  });
});

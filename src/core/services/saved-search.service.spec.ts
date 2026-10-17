import { SavedSearchService } from './saved-search.service';
import { SavedSearch } from '../domain/entities/saved-search.entity';
import type { ISavedSearchRepository } from '../repositories/saved-search.repository';

describe('SavedSearchService', () => {
  const savedSearch = new SavedSearch(
    'search-id',
    'organization-id',
    'Lab roles',
    { profession: 'biologist' },
    true,
  );

  const createRepository = (): jest.Mocked<ISavedSearchRepository> => ({
    create: jest.fn(async search => search),
    findById: jest.fn(async (_id: string) => savedSearch),
    findByOrganizationId: jest.fn(async (_organizationId: string) => [
      savedSearch,
    ]),
    update: jest.fn(async (id, changes) => ({
      ...savedSearch,
      ...changes,
      id,
    })),
    delete: jest.fn(async (_id: string): Promise<boolean> => true),
  });

  it('keeps alerts disabled unless the creator opts in', async () => {
    const repository = createRepository();
    const service = new SavedSearchService(repository);

    const created = await service.create({
      organizationId: 'organization-id',
      name: 'Lab roles',
      filters: { profession: 'biologist' },
    });

    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({ notifyEnabled: false }),
    );
    expect(created.notifyEnabled).toBe(false);

    const optedIn = await service.create({
      organizationId: 'organization-id',
      name: 'Lab roles',
      notifyEnabled: true,
    });
    expect(optedIn.notifyEnabled).toBe(true);
  });

  it('preserves alert consent when an update omits it', async () => {
    const repository = createRepository();
    const service = new SavedSearchService(repository);

    const updated = await service.update('search-id', {
      name: 'Updated search',
    });

    expect(repository.update).toHaveBeenCalledWith('search-id', {
      name: 'Updated search',
      notifyEnabled: true,
    });
    expect(updated?.notifyEnabled).toBe(true);
  });

  it('allows an explicit opt-out when a saved search is updated', async () => {
    const repository = createRepository();
    const service = new SavedSearchService(repository);

    const updated = await service.update('search-id', { notifyEnabled: false });

    expect(updated?.notifyEnabled).toBe(false);
  });

  it('returns a saved search without sending a notification', async () => {
    const repository = createRepository();
    const service = new SavedSearchService(repository);

    const result = await service.getById('search-id');

    expect(result).toBe(savedSearch);
    expect(repository.findById).toHaveBeenCalledWith('search-id');
  });
});

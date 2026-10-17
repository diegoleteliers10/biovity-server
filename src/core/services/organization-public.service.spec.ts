import type { DataSource } from 'typeorm';
import { OrganizationPublicService } from './organization-public.service';

const verifiedOrganization = {
  id: 'organization-id',
  name: 'Verified Company',
  slug: 'verified-company',
  website: 'https://verified.example',
  logo: null,
  description: null,
  industry: null,
  size: null,
  foundedYear: null,
  linkedinUrl: null,
  twitterUrl: null,
  address: null,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  activeJobsCount: '2',
};

describe('OrganizationPublicService', () => {
  it('hides an unverified organization and returns a verified profile', async () => {
    const query = jest.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([
      verifiedOrganization,
    ]);
    const service = new OrganizationPublicService(
      { query } as unknown as DataSource,
    );

    await expect(service.getPublicBySlugOrId('unverified-company')).resolves.toBeNull();
    await expect(service.getPublicBySlugOrId('verified-company')).resolves.toMatchObject({
      id: 'organization-id',
      name: 'Verified Company',
      slug: 'verified-company',
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("o.verification_status = 'verified'"),
      ['unverified-company'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("o.verification_status = 'verified'"),
      ['verified-company'],
    );
  });

  it('lists verified organizations and counts only verified rows', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([verifiedOrganization])
      .mockResolvedValueOnce([{ count: '1' }]);
    const service = new OrganizationPublicService(
      { query } as unknown as DataSource,
    );

    await expect(service.listPublic()).resolves.toMatchObject({
      data: [{ id: 'organization-id', name: 'Verified Company' }],
      total: 1,
    });

    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining("o.verification_status = 'verified'"),
      [20, 0],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("verification_status = 'verified'"),
    );
  });
});

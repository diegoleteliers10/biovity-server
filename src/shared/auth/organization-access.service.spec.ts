import type { DataSource } from 'typeorm';
import type { AuthenticatedUser } from './better-auth-session.service';
import { OrganizationAccessService } from './organization-access.service';

describe('OrganizationAccessService.assertResumeAccess', () => {
  const query = jest.fn();
  const service = new OrganizationAccessService({
    query,
  } as unknown as DataSource);
  const recruiter: AuthenticatedUser = {
    id: '44444444-4444-4444-8444-444444444444',
    email: 'recruiter@example.com',
    type: 'organization',
    organizationId: '55555555-5555-4555-8555-555555555555',
  };

  beforeEach(() => jest.clearAllMocks());

  it('allows organization members to read a professional resume without a prior relationship', async () => {
    query
      .mockResolvedValueOnce([
        {
          userId: '22222222-2222-4222-8222-222222222222',
          type: 'professional',
        },
      ])
      .mockResolvedValueOnce([{ role: 'recruiter' }]);

    await expect(
      service.assertResumeAccess('resume-id', recruiter, 'read'),
    ).resolves.toBeUndefined();
    expect(query).toHaveBeenCalledTimes(2);
  });
});

import { ForbiddenException } from '@nestjs/common';
import type { DataSource } from 'typeorm';
import { OrganizationAccessService } from './organization-access.service';
import type { AuthenticatedUser } from './better-auth-session.service';

const organizationId = '11111111-1111-4111-8111-111111111111';
const user: AuthenticatedUser = {
  id: '22222222-2222-4222-8222-222222222222',
  email: 'member@example.com',
  type: 'organization',
  organizationId: null,
};

describe('OrganizationAccessService', () => {
  it('allows read access to a viewer membership', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ role: 'viewer' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertAccess(organizationId, user, 'read'),
    ).resolves.toBeUndefined();
  });

  it('denies write access to a viewer membership', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ role: 'viewer' }]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertAccess(organizationId, user, 'manage'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('denies requests without a user identity', async () => {
    const access = new OrganizationAccessService({} as DataSource);

    await expect(
      access.assertAccess(organizationId, undefined, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('allows an event participant to read the event and RSVP', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          organizerId: '33333333-3333-4333-8333-333333333333',
          candidateId: user.id,
          organizationId,
          isParticipant: true,
        },
      ]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertEventAccess('event-id', user, 'read'),
    ).resolves.toBeDefined();
    await expect(
      access.assertEventAccess('event-id', user, 'rsvp'),
    ).resolves.toBeDefined();
  });

  it('denies a non-participant access to an event without an organization', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([
        {
          organizerId: '33333333-3333-4333-8333-333333333333',
          candidateId: null,
          organizationId: null,
          isParticipant: false,
        },
      ]),
    } as unknown as DataSource;
    const access = new OrganizationAccessService(dataSource);

    await expect(
      access.assertEventAccess('event-id', user, 'read'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});

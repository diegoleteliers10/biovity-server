import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { ActivityLogService } from '../../../core/services/activity-log.service';
import { ActivityLogController } from './activity-log.controller';

const requester: AuthenticatedUser = {
  id: 'user-id',
  email: 'user@example.com',
  type: 'organization',
  organizationId: 'other-org',
};

const makeController = () => {
  const service = {
    findByOrganization: jest.fn(),
    log: jest.fn(),
  } as unknown as ActivityLogService;
  const organizationAccess = {
    assertAccess: jest.fn().mockRejectedValue(new ForbiddenException()),
  } as unknown as OrganizationAccessService;
  return {
    controller: new ActivityLogController(service, organizationAccess),
    service,
    organizationAccess,
  };
};

const entry = {
  userId: 'user-id',
  action: 'job.created',
  description: 'Created a job',
};

describe('ActivityLogController authorization', () => {
  it('denies cross-organization reads before querying logs', async () => {
    const { controller, service, organizationAccess } = makeController();

    await expect(
      controller.findAll('target-org', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'read',
    );
    expect(service.findByOrganization).not.toHaveBeenCalled();
  });

  it('denies audit writes without manage access before logging', async () => {
    const { controller, service, organizationAccess } = makeController();

    await expect(
      controller.create('target-org', entry, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(service.log).not.toHaveBeenCalled();
  });

  it('rejects audit entries attributed to a different user', async () => {
    const { controller, service, organizationAccess } = makeController();
    jest.mocked(organizationAccess.assertAccess).mockResolvedValue(undefined);

    await expect(
      controller.create(
        'target-org',
        { ...entry, userId: 'forged-user' },
        requester,
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(service.log).not.toHaveBeenCalled();
  });

  it('rejects audit entries attributed to a different user for admins', async () => {
    const { controller, service, organizationAccess } = makeController();
    const admin: AuthenticatedUser = {
      ...requester,
      id: 'admin-id',
      type: 'admin',
    };
    jest.mocked(organizationAccess.assertAccess).mockResolvedValue(undefined);

    await expect(
      controller.create('target-org', entry, admin),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(service.log).not.toHaveBeenCalled();
  });

  it('logs an audit entry under the authenticated user identity', async () => {
    const { controller, service, organizationAccess } = makeController();
    jest.mocked(organizationAccess.assertAccess).mockResolvedValue(undefined);

    await controller.create('target-org', entry, requester);

    expect(service.log).toHaveBeenCalledWith({
      organizationId: 'target-org',
      userId: 'user-id',
      action: entry.action,
      description: entry.description,
      metadata: undefined,
    });
  });
});

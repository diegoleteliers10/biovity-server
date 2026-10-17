import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { UserMetricsService } from '../../../core/services/user-metrics.service';
import { UserMetricsController } from './user-metrics.controller';

const owner: AuthenticatedUser = {
  id: 'target-user',
  email: 'owner@example.com',
  type: 'professional',
  organizationId: null,
};

const otherUser: AuthenticatedUser = {
  id: 'other-user',
  email: 'other@example.com',
  type: 'professional',
  organizationId: null,
};

const makeController = () => {
  const metrics = {
    getMetrics: jest.fn().mockResolvedValue({ quickMetrics: {} }),
  } as unknown as UserMetricsService;
  return { controller: new UserMetricsController(metrics), metrics };
};

describe('UserMetricsController', () => {
  const originalAdminEmails = process.env.ADMIN_EMAILS;

  afterEach(() => {
    if (originalAdminEmails === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = originalAdminEmails;
    }
  });

  it('returns metrics to the owner', async () => {
    const { controller, metrics } = makeController();

    await expect(
      controller.getMetrics('target-user', owner, 'week'),
    ).resolves.toEqual({
      quickMetrics: {},
    });
    expect(metrics.getMetrics).toHaveBeenCalledWith('target-user', 'week');
  });

  it('returns metrics to an admin', async () => {
    const { controller, metrics } = makeController();
    process.env.ADMIN_EMAILS = 'admin@example.com';
    const admin: AuthenticatedUser = {
      id: 'admin-user',
      email: 'admin@example.com',
      type: 'professional',
      organizationId: null,
    };

    await controller.getMetrics('target-user', admin);

    expect(metrics.getMetrics).toHaveBeenCalledWith('target-user', undefined);
  });

  it('denies another user before calling the metrics service', async () => {
    const { controller, metrics } = makeController();

    await expect(
      controller.getMetrics('target-user', otherUser),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(metrics.getMetrics).not.toHaveBeenCalled();
  });
});

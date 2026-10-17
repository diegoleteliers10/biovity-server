import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { OrganizationVerificationService } from '../../../core/services/organization-verification.service';
import { OrganizationVerificationController } from './organization-verification.controller';

const admin: AuthenticatedUser = {
  id: 'admin-id',
  email: 'admin@example.com',
  type: 'admin',
  organizationId: null,
};

const professional: AuthenticatedUser = {
  id: 'professional-id',
  email: 'professional@example.com',
  type: 'professional',
  organizationId: null,
};

function makeController() {
  const verification = {
    listPending: jest.fn().mockResolvedValue([]),
    review: jest.fn().mockResolvedValue(undefined),
  } as unknown as OrganizationVerificationService;
  const controller = new OrganizationVerificationController(
    verification,
    {} as OrganizationAccessService,
  );
  return { controller, verification };
}

describe('OrganizationVerificationController', () => {
  it('rejects queue reads without an authenticated user', async () => {
    const { controller, verification } = makeController();

    await expect(controller.listPending(undefined)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
    expect(verification.listPending).not.toHaveBeenCalled();
  });

  it('rejects queue reads by a non-admin user', async () => {
    const { controller, verification } = makeController();
    const result = Reflect.apply(controller.listPending, controller, [
      professional,
    ]);

    await expect(result).rejects.toBeInstanceOf(ForbiddenException);
    expect(verification.listPending).not.toHaveBeenCalled();
  });

  it('rejects a review without an authenticated reviewer', async () => {
    const { controller, verification } = makeController();

    await expect(
      controller.review(
        'request-id',
        { decision: 'approved', reason: 'Confirmed' },
        undefined,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verification.review).not.toHaveBeenCalled();
  });

  it('records the decision under the authenticated admin identity', async () => {
    const { controller, verification } = makeController();

    await expect(
      controller.review(
        'request-id',
        { decision: 'approved', reason: 'Confirmed' },
        admin,
      ),
    ).resolves.toBeUndefined();
    expect(verification.review).toHaveBeenCalledWith(
      'request-id',
      'admin-id',
      'approved',
      'Confirmed',
    );
  });

  it('returns pending requests to an authenticated admin', async () => {
    const { controller, verification } = makeController();
    const result = Reflect.apply(controller.listPending, controller, [admin]);

    await expect(result).resolves.toEqual([]);
    expect(verification.listPending).toHaveBeenCalledTimes(1);
  });
});

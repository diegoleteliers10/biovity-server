import { ForbiddenException } from '@nestjs/common';
import type { UserService } from '../../../core/services/user.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import type { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { UserController } from './user.controller';

const orphanOrganization: AuthenticatedUser = {
  id: '11111111-1111-4111-8111-111111111111',
  email: 'orphan@example.com',
  type: 'organization',
  organizationId: null,
};

describe('UserController organization directory access', () => {
  const userService = {
    getUserById: jest.fn(),
    getAllUsers: jest.fn(),
    incrementViews: jest.fn(),
  };
  const organizationAccess = {
    assertAccess: jest.fn(),
    hasCandidateRelationship: jest.fn(),
  };
  const controller = new UserController(
    userService as unknown as UserService,
    organizationAccess as unknown as OrganizationAccessService,
  );

  beforeEach(() => jest.clearAllMocks());

  it('denies directory listing for an organization without membership', async () => {
    await expect(
      controller.getAllUsers({}, orphanOrganization),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userService.getAllUsers).not.toHaveBeenCalled();
  });

  it('denies candidate reads for an organization without membership', async () => {
    userService.getUserById.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      type: 'professional',
    });

    await expect(
      controller.getUserById(
        '22222222-2222-4222-8222-222222222222',
        orphanOrganization,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(organizationAccess.assertAccess).not.toHaveBeenCalled();
  });

  it('does not increment profile views for a denied request', async () => {
    userService.getUserById.mockResolvedValue({
      id: '22222222-2222-4222-8222-222222222222',
      type: 'professional',
    });

    await expect(
      controller.incrementViews(
        '22222222-2222-4222-8222-222222222222',
        orphanOrganization,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(userService.incrementViews).not.toHaveBeenCalled();
  });
});

import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { ApiKeysService } from '../../../core/services/api-keys.service';
import { ApiKeysController } from './api-keys.controller';

const requester: AuthenticatedUser = {
  id: 'user-id',
  email: 'user@example.com',
  type: 'organization',
  organizationId: 'other-org',
};

const makeController = () => {
  const apiKeysService = {
    create: jest.fn(),
    listByOrg: jest.fn(),
    revoke: jest.fn(),
  } as unknown as ApiKeysService;
  const organizationAccess = {
    assertAccess: jest.fn().mockRejectedValue(new ForbiddenException()),
  } as unknown as OrganizationAccessService;
  return {
    controller: new ApiKeysController(apiKeysService, organizationAccess),
    apiKeysService,
    organizationAccess,
  };
};

describe('ApiKeysController authorization', () => {
  it('denies key creation without manage access', async () => {
    const { controller, apiKeysService, organizationAccess } = makeController();

    await expect(
      controller.create('target-org', { name: 'Integration' }, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(apiKeysService.create).not.toHaveBeenCalled();
  });

  it('denies key reads without manage access', async () => {
    const { controller, apiKeysService, organizationAccess } = makeController();

    await expect(
      controller.list('target-org', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(apiKeysService.listByOrg).not.toHaveBeenCalled();
  });

  it('denies key revocation without manage access', async () => {
    const { controller, apiKeysService, organizationAccess } = makeController();

    await expect(
      controller.revoke('target-org', 'key-id', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(apiKeysService.revoke).not.toHaveBeenCalled();
  });

  it('omits stored hashes and prefixes from listed key data', async () => {
    const { controller, apiKeysService, organizationAccess } = makeController();
    jest.mocked(organizationAccess.assertAccess).mockResolvedValue(undefined);
    jest.mocked(apiKeysService.listByOrg).mockResolvedValue([
      {
        id: 'key-id',
        name: 'Integration',
        keyHash: 'secret-hash',
        keyPrefix: 'bv_live',
      },
    ] as never);

    await expect(controller.list('target-org', requester)).resolves.toEqual([
      { id: 'key-id', name: 'Integration' },
    ]);
  });
});

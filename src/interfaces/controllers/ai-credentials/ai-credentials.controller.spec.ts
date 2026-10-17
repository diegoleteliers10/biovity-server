import { ForbiddenException } from '@nestjs/common';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { AiCredentialsService } from '../../../core/services/ai-credentials.service';
import { AiProvider } from '../../../core/domain/enums/ai-provider';
import { AiCredentialsController } from './ai-credentials.controller';

const requester: AuthenticatedUser = {
  id: 'user-id',
  email: 'user@example.com',
  type: 'organization',
  organizationId: 'other-org',
};

const makeController = () => {
  const service = {
    getMasked: jest.fn(),
    list: jest.fn(),
    save: jest.fn(),
    activate: jest.fn(),
    remove: jest.fn(),
    removeById: jest.fn(),
  } as unknown as AiCredentialsService;
  const organizationAccess = {
    assertAccess: jest.fn().mockRejectedValue(new ForbiddenException()),
  } as unknown as OrganizationAccessService;
  return {
    controller: new AiCredentialsController(service, organizationAccess),
    service,
    organizationAccess,
  };
};

describe('AiCredentialsController authorization', () => {
  it('denies credential preview without manage access', async () => {
    const { controller, service, organizationAccess } = makeController();

    await expect(
      controller.getMasked('target-org', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'target-org',
      requester,
      'manage',
    );
    expect(service.getMasked).not.toHaveBeenCalled();
  });

  it('denies credential listing without manage access', async () => {
    const { controller, service } = makeController();

    await expect(
      controller.list('target-org', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.list).not.toHaveBeenCalled();
  });

  it('denies saving credentials without manage access', async () => {
    const { controller, service } = makeController();

    await expect(
      controller.save(
        'target-org',
        {
          provider: AiProvider.OPENAI,
          modelId: 'model',
          apiKey: 'secret-key-value',
        },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.save).not.toHaveBeenCalled();
  });

  it('denies credential activation without manage access', async () => {
    const { controller, service } = makeController();

    await expect(
      controller.activate('target-org', 'credential-id', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.activate).not.toHaveBeenCalled();
  });

  it('denies credential removal without manage access', async () => {
    const { controller, service } = makeController();

    await expect(
      controller.remove('target-org', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.remove).not.toHaveBeenCalled();
  });

  it('denies credential deletion by ID without manage access', async () => {
    const { controller, service } = makeController();

    await expect(
      controller.removeById('target-org', 'credential-id', requester),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(service.removeById).not.toHaveBeenCalled();
  });
});

import { ForbiddenException } from '@nestjs/common';
import { ApplicationRejectionReasonController } from './application-rejection-reason.controller';

describe('ApplicationRejectionReasonController', () => {
  it('checks organization read access before listing reasons', async () => {
    const accessError = new ForbiddenException();
    const organizationAccess = {
      assertAccess: jest.fn().mockRejectedValue(accessError),
    };
    const service = { list: jest.fn() };
    const controller = new ApplicationRejectionReasonController(
      service as never,
      organizationAccess as never,
    );

    await expect(
      controller.list('other-organization-id', undefined),
    ).rejects.toBe(accessError);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'other-organization-id',
      undefined,
      'read',
    );
    expect(service.list).not.toHaveBeenCalled();
  });

  it('checks organization management access before creating a reason', async () => {
    const accessError = new ForbiddenException();
    const organizationAccess = {
      assertAccess: jest.fn().mockRejectedValue(accessError),
    };
    const service = { create: jest.fn() };
    const controller = new ApplicationRejectionReasonController(
      service as never,
      organizationAccess as never,
    );

    await expect(
      controller.create(
        'other-organization-id',
        { label: 'Experiencia' },
        undefined,
      ),
    ).rejects.toBe(accessError);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'other-organization-id',
      undefined,
      'manage',
    );
    expect(service.create).not.toHaveBeenCalled();
  });

  it('checks organization management access before changing a reason', async () => {
    const accessError = new ForbiddenException();
    const organizationAccess = {
      assertAccess: jest.fn().mockRejectedValue(accessError),
    };
    const service = { update: jest.fn() };
    const controller = new ApplicationRejectionReasonController(
      service as never,
      organizationAccess as never,
    );

    await expect(
      controller.update(
        'other-organization-id',
        'reason-id',
        { active: false },
        undefined,
      ),
    ).rejects.toBe(accessError);

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      'other-organization-id',
      undefined,
      'manage',
    );
    expect(service.update).not.toHaveBeenCalled();
  });
});

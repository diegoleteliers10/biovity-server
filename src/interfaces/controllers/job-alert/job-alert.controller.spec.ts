import { ForbiddenException } from '@nestjs/common';
import { JobAlertService } from '../../../core/services/job-alert.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { JobAlertController } from './job-alert.controller';
import { JobAlertFrequency } from '../../../core/domain/enums';

const requester: AuthenticatedUser = {
  id: 'owner', email: 'owner@example.com', type: 'professional', organizationId: null,
};

describe('JobAlertController ownership', () => {
  const service = { create: jest.fn(), getByUserId: jest.fn(), delete: jest.fn() };
  const controller = new JobAlertController(service as unknown as JobAlertService);
  beforeEach(() => jest.clearAllMocks());

  it('rejects another user before service access', async () => {
    await expect(controller.create({ userId: 'other', frequency: JobAlertFrequency.DIARIA }, requester)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.getByUserId('other', requester)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.delete('alert', 'other', requester)).rejects.toBeInstanceOf(ForbiddenException);
    expect(service.create).not.toHaveBeenCalled();
    expect(service.getByUserId).not.toHaveBeenCalled();
    expect(service.delete).not.toHaveBeenCalled();
  });

  it('permits the owner and rejects a missing session', async () => {
    service.getByUserId.mockResolvedValue([]);
    await expect(controller.getByUserId('owner', requester)).resolves.toEqual([]);
    await expect(controller.getByUserId('owner', undefined)).rejects.toBeInstanceOf(ForbiddenException);
  });
});

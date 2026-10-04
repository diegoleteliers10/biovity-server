import { BadRequestException } from '@nestjs/common';
import { SubscriptionController } from './subscription.controller';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { IS_PUBLIC_KEY } from '../../../shared/decorators/public.decorator';

describe('Subscription callback boundary', () => {
  const service = { handleWebhook: jest.fn().mockResolvedValue(null) };
  const controller = new SubscriptionController(
    service as unknown as SubscriptionService,
    {} as OrganizationAccessService,
  );
  beforeEach(() => jest.clearAllMocks());
  it('allows the provider to call without a session', () => {
    expect(
      Reflect.getMetadata(
        IS_PUBLIC_KEY,
        SubscriptionController.prototype.handleWebhook,
      ),
    ).toBe(true);
  });
  it('passes only the signed query ID and signature, ignoring client plan data', async () => {
    await controller.handleWebhook('payment', '', '123', 'signed', 'request', {
      id: '999',
      status: 'approved',
      external_reference: 'victim:enterprise',
    });
    expect(service.handleWebhook).toHaveBeenCalledWith({
      id: '123',
      signature: 'signed',
      requestId: 'request',
    });
  });
  it('does not accept an unsigned body payment ID', async () => {
    await expect(
      controller.handleWebhook('payment', '', '', 'signed', 'request', {
        id: '123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(service.handleWebhook).not.toHaveBeenCalled();
  });
});

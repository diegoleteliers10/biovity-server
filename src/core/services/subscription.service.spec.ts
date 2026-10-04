import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { createHmac } from 'crypto';
import { DataSource } from 'typeorm';
import { SubscriptionService } from './subscription.service';
import { ISubscriptionRepository } from '../repositories/subscription.repository';
import { IOrganizationRepository } from '../repositories/organization.repository';
import { SubscriptionPlan, PaymentStatus } from '../domain/enums';
import { SubscriptionEntity } from '../../infrastructure/database/orm/subscription.entity';
import { OrganizationEntity } from '../../infrastructure/database/orm/organization.entity';

const paymentGet = jest.fn();
const orderGet = jest.fn();
const preferenceGet = jest.fn();
jest.mock('mercadopago', () => ({
  MercadoPagoConfig: jest.fn(),
  Payment: jest.fn().mockImplementation(() => ({ get: paymentGet })),
  MerchantOrder: jest.fn().mockImplementation(() => ({ get: orderGet })),
  Preference: jest.fn().mockImplementation(() => ({ get: preferenceGet })),
}));
const organizationId = '11111111-1111-4111-8111-111111111111';
const secret = 'test-payment-secret';
function notification() {
  const id = '123';
  const requestId = 'request';
  const ts = '1700000000';
  const hash = createHmac('sha256', secret)
    .update(`id:${id};request-id:${requestId};ts:${ts};`)
    .digest('hex');
  return { id, requestId, signature: `ts=${ts},v1=${hash}` };
}
function payment(plan = 'basic', amount = 19900) {
  return {
    id: 123,
    status: 'approved',
    external_reference: `${organizationId}:${plan}`,
    order: { id: 'order' },
    currency_id: 'CLP',
    transaction_amount: amount,
    collector_id: 42,
  };
}
function setup() {
  const pending = {
    id: 'pending',
    organizationId,
    planName: SubscriptionPlan.BASIC,
    mercadopagoPreferenceId: 'checkout',
    externalReference: `${organizationId}:basic`,
    mercadopagoPaymentId: null,
    paymentStatus: PaymentStatus.PENDING,
    features: {},
    createdAt: new Date(),
  };
  const manager = {
    findOne: jest
      .fn()
      .mockImplementation((entity, options) =>
        entity === OrganizationEntity
          ? Promise.resolve({ id: organizationId })
          : options.where.mercadopagoPaymentId
            ? Promise.resolve(null)
            : Promise.resolve(pending),
      ),
    update: jest.fn().mockResolvedValue({}),
    query: jest.fn().mockResolvedValue([]),
    save: jest
      .fn()
      .mockImplementation((_entity, value) => Promise.resolve(value)),
  };
  const dataSource = {
    transaction: jest.fn().mockImplementation(operation => operation(manager)),
  };
  const service = new SubscriptionService(
    {} as ISubscriptionRepository,
    {} as IOrganizationRepository,
    dataSource as unknown as DataSource,
  );
  return { service, manager, dataSource };
}
describe('SubscriptionService verified payments', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.MERCADO_PAGO_WEBHOOK_SECRET = secret;
    paymentGet.mockResolvedValue(payment());
    orderGet.mockResolvedValue({
      preference_id: 'checkout',
      collector: { id: 42 },
    });
    preferenceGet.mockResolvedValue({
      collector_id: 42,
      external_reference: `${organizationId}:basic`,
    });
  });
  afterAll(() => delete process.env.MERCADO_PAGO_WEBHOOK_SECRET);
  it('rejects an unsigned callback before any provider or database call', async () => {
    const { service, dataSource } = setup();
    await expect(
      service.handleWebhook({ id: '123', signature: '', requestId: '' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(paymentGet).not.toHaveBeenCalled();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
  it('rejects a changed payment ID in a signed callback', async () => {
    await expect(
      setup().service.handleWebhook({ ...notification(), id: '999' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(paymentGet).not.toHaveBeenCalled();
  });
  it('rejects an unknown plan and an incorrect currency', async () => {
    paymentGet.mockResolvedValue(payment('unknown', 39900));
    await expect(
      setup().service.handleWebhook(notification()),
    ).rejects.toBeInstanceOf(BadRequestException);
    paymentGet.mockResolvedValue({ ...payment(), currency_id: 'USD' });
    await expect(
      setup().service.handleWebhook(notification()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('keeps the enterprise plan from the verified checkout', async () => {
    const { service, manager } = setup();
    paymentGet.mockResolvedValue(payment('enterprise', 89900));
    preferenceGet.mockResolvedValue({
      collector_id: 42,
      external_reference: `${organizationId}:enterprise`,
    });
    manager.findOne.mockImplementation((entity, options) =>
      Promise.resolve(
        entity === OrganizationEntity
          ? { id: organizationId }
          : options.where.mercadopagoPaymentId
            ? null
            : {
                id: 'enterprise-checkout',
                organizationId,
                planName: SubscriptionPlan.ENTERPRISE,
                mercadopagoPreferenceId: 'checkout',
              },
      ),
    );
    expect((await service.handleWebhook(notification()))?.planName).toBe(
      SubscriptionPlan.ENTERPRISE,
    );
  });
  it('rejects a payment below the plan price', async () => {
    paymentGet.mockResolvedValue(payment('basic', 1));
    const { service, dataSource } = setup();
    await expect(service.handleWebhook(notification())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
  it('rejects a payment for another merchant', async () => {
    orderGet.mockResolvedValue({
      preference_id: 'checkout',
      collector: { id: 99 },
    });
    await expect(
      setup().service.handleWebhook(notification()),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
  it('requires a checkout created by this service', async () => {
    const { service, manager } = setup();
    manager.findOne.mockImplementation(entity =>
      Promise.resolve(
        entity === OrganizationEntity ? { id: organizationId } : null,
      ),
    );
    await expect(service.handleWebhook(notification())).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(manager.save).not.toHaveBeenCalled();
  });
  it('upgrades an active plan and keeps the verified basic plan', async () => {
    const { service, manager } = setup();
    const subscription = await service.handleWebhook(notification());
    expect(subscription?.planName).toBe(SubscriptionPlan.BASIC);
    expect(subscription?.isActive).toBe(true);
    expect(manager.update).toHaveBeenCalledWith(
      SubscriptionEntity,
      { organizationId, isActive: true },
      { isActive: false },
    );
    expect(manager.update).toHaveBeenCalledWith(
      OrganizationEntity,
      organizationId,
      { subscriptionId: 'pending' },
    );
  });
  it('does not change or extend a payment that was processed', async () => {
    const { service, manager } = setup();
    manager.findOne.mockImplementation(entity =>
      Promise.resolve(
        entity === OrganizationEntity
          ? { id: organizationId }
          : {
              id: 'approved',
              planName: SubscriptionPlan.BASIC,
              organizationId,
              isActive: true,
            },
      ),
    );
    expect((await service.handleWebhook(notification()))?.id).toBe('approved');
    expect(manager.save).not.toHaveBeenCalled();
    expect(manager.update).not.toHaveBeenCalled();
  });
  it.each(['refunded', 'charged_back', 'cancelled'])(
    'revokes only the subscription bound to a %s payment',
    async status => {
      paymentGet.mockResolvedValue({ ...payment(), status });
      const { service, manager } = setup();
      manager.findOne.mockImplementation(entity =>
        Promise.resolve(
          entity === OrganizationEntity
            ? { id: organizationId }
            : {
                id: 'paid',
                organizationId,
                planName: SubscriptionPlan.BASIC,
                isActive: true,
              },
        ),
      );
      const result = await service.handleWebhook(notification());
      expect(result?.isActive).toBe(false);
      expect(manager.query).toHaveBeenCalledWith(
        expect.stringContaining('AND "subscriptionId" = $2'),
        [organizationId, 'paid'],
      );
      expect(manager.update).not.toHaveBeenCalled();
    },
  );
  it('does not activate a pending provider payment', async () => {
    paymentGet.mockResolvedValue({ ...payment(), status: 'pending' });
    const { service, dataSource } = setup();
    expect(await service.handleWebhook(notification())).toBeNull();
    expect(dataSource.transaction).not.toHaveBeenCalled();
  });
});

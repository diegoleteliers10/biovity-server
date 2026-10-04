import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import {
  MercadoPagoConfig,
  Preference,
  Payment,
  MerchantOrder,
} from 'mercadopago';
import { ISubscriptionRepository } from '../repositories/subscription.repository';
import { IOrganizationRepository } from '../repositories/organization.repository';
import { Subscription } from '../domain/entities/subscription.entity';
import { SubscriptionPlan, PaymentStatus } from '../domain/enums';
import { SubscriptionEntity } from '../../infrastructure/database/orm/subscription.entity';
import { OrganizationEntity } from '../../infrastructure/database/orm/organization.entity';
import { SubscriptionDomainOrmMapper } from '../../shared/mappers/subscription/subscriptionDomain-orm.mapper';

export type CreatePreferenceInput = { plan: string; organizationId: string };
export type PreferenceResult = {
  preferenceId: string;
  initPoint: string;
  plan: string;
  price: number;
};
export type WebhookInput = { id: string; signature: string; requestId: string };
const PLAN_PRICES = {
  free: 0,
  basic: 19900,
  premium: 39900,
  enterprise: 89900,
};
function parsePlan(input: string): SubscriptionPlan | null {
  const plan = input.toLowerCase();
  if (plan === 'pro') return SubscriptionPlan.PREMIUM;
  return (
    Object.values(SubscriptionPlan).find(value => String(value) === plan) ??
    null
  );
}

@Injectable()
export class SubscriptionService {
  private readonly mercadopagoClient: MercadoPagoConfig;
  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    @InjectDataSource() private readonly dataSource: DataSource,
  ) {
    this.mercadopagoClient = new MercadoPagoConfig({
      accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN || '',
      options: { timeout: 10000 },
    });
  }
  async getSubscriptionByOrganizationId(
    organizationId: string,
  ): Promise<Subscription | null> {
    return this.subscriptionRepository.findByOrganizationId(organizationId);
  }
  async createMercadoPagoPreference(
    data: CreatePreferenceInput,
  ): Promise<PreferenceResult> {
    const organization = await this.organizationRepository.findById(
      data.organizationId,
    );
    if (!organization)
      return Promise.reject(new NotFoundException('Organization not found'));
    const plan = parsePlan(data.plan);
    if (!plan)
      return Promise.reject(
        new BadRequestException('Unknown subscription plan'),
      );
    const price = PLAN_PRICES[plan];
    if (plan === SubscriptionPlan.FREE) {
      await this.dataSource.transaction(async manager => {
        await manager.findOne(OrganizationEntity, {
          where: { id: data.organizationId },
          lock: { mode: 'pessimistic_write' },
        });
        const existing = await manager.findOne(SubscriptionEntity, {
          where: { organizationId: data.organizationId, isActive: true },
        });
        if (existing) return;
        const subscription = new Subscription(
          crypto.randomUUID(),
          data.organizationId,
          plan,
          new Date(),
          null,
          true,
          this.getFeaturesForPlan(plan),
          null,
          null,
          null,
          `${data.organizationId}:free`,
          PaymentStatus.APPROVED,
          null,
        );
        const saved = await manager.save(
          SubscriptionEntity,
          SubscriptionDomainOrmMapper.toOrm(subscription),
        );
        await manager.update(OrganizationEntity, data.organizationId, {
          subscriptionId: saved.id,
        });
      });
      return { preferenceId: 'free-plan', initPoint: '', plan, price };
    }
    const reference = `${data.organizationId}:${plan}`;
    const preference = await new Preference(this.mercadopagoClient).create({
      body: {
        external_reference: reference,
        metadata: { organizationId: data.organizationId, plan },
        items: [
          {
            id: `subscription-${plan}`,
            title: `Subscription ${plan}`,
            quantity: 1,
            unit_price: price,
            currency_id: 'CLP',
          },
        ],
        payment_methods: { installments: 1 },
        back_urls: {
          success:
            process.env.MP_SUCCESS_URL ||
            'https://biovity.com/subscription/success',
          failure:
            process.env.MP_FAILURE_URL ||
            'https://biovity.com/subscription/failure',
          pending:
            process.env.MP_PENDING_URL ||
            'https://biovity.com/subscription/pending',
        },
        auto_return: 'approved',
        notification_url: process.env.MP_WEBHOOK_URL || '',
      },
    });
    if (!preference.id || !preference.init_point)
      return Promise.reject(
        new BadRequestException('Payment preference has no checkout URL'),
      );
    const pending = new Subscription(
      crypto.randomUUID(),
      data.organizationId,
      plan,
      new Date(),
      null,
      false,
      this.getFeaturesForPlan(plan),
      null,
      preference.id,
      null,
      reference,
      PaymentStatus.PENDING,
      null,
    );
    await this.subscriptionRepository.create(pending);
    return {
      preferenceId: preference.id,
      initPoint: preference.init_point,
      plan,
      price,
    };
  }
  async handleWebhook(data: WebhookInput): Promise<Subscription | null> {
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    const parts = data.signature
      .split(',')
      .reduce<Record<string, string | undefined>>((result, part) => {
        const [key, value] = part.trim().split('=');
        if (key) result[key] = value;
        return result;
      }, {});
    if (
      !secret ||
      !data.requestId ||
      !data.id ||
      !parts.ts ||
      !parts.v1 ||
      !/^[a-f0-9]{64}$/i.test(parts.v1)
    ) {
      return Promise.reject(
        new UnauthorizedException('Invalid payment signature'),
      );
    }
    const manifest = `id:${data.id.toLowerCase()};request-id:${data.requestId};ts:${parts.ts};`;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(manifest)
      .digest();
    if (!crypto.timingSafeEqual(expected, Buffer.from(parts.v1, 'hex')))
      return Promise.reject(
        new UnauthorizedException('Invalid payment signature'),
      );
    const payment = await new Payment(this.mercadopagoClient).get({
      id: data.id,
    });
    const terminalStatus =
      payment.status === 'refunded'
        ? PaymentStatus.REFUNDED
        : payment.status === 'charged_back'
          ? PaymentStatus.CHARGED_BACK
          : payment.status === 'cancelled'
            ? PaymentStatus.CANCELLED
            : null;
    if (payment.status !== 'approved' && !terminalStatus) return null;
    if (
      String(payment.id) !== data.id ||
      !payment.external_reference ||
      !payment.order?.id
    )
      return Promise.reject(
        new BadRequestException('Payment has no valid order'),
      );
    const [organizationId, planInput, extra] =
      payment.external_reference.split(':');
    const plan = parsePlan(planInput ?? '');
    if (
      !organizationId ||
      extra !== undefined ||
      !plan ||
      plan === SubscriptionPlan.FREE ||
      payment.currency_id !== 'CLP' ||
      payment.transaction_amount !== PLAN_PRICES[plan]
    ) {
      return Promise.reject(
        new BadRequestException(
          'Payment does not match the subscription price',
        ),
      );
    }
    const merchantOrderId = String(payment.order.id);
    const order = await new MerchantOrder(this.mercadopagoClient).get({
      merchantOrderId,
    });
    if (
      !order.preference_id ||
      !payment.collector_id ||
      order.collector?.id !== payment.collector_id
    )
      return Promise.reject(
        new BadRequestException('Payment merchant does not match'),
      );
    const preference = await new Preference(this.mercadopagoClient).get({
      preferenceId: order.preference_id,
    });
    if (
      preference.collector_id !== payment.collector_id ||
      preference.external_reference !== payment.external_reference
    )
      return Promise.reject(
        new BadRequestException('Payment preference does not match'),
      );
    return this.dataSource.transaction(async manager => {
      const organization = await manager.findOne(OrganizationEntity, {
        where: { id: organizationId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!organization)
        return Promise.reject(new NotFoundException('Organization not found'));
      const duplicate = await manager.findOne(SubscriptionEntity, {
        where: { mercadopagoPaymentId: data.id },
      });
      if (duplicate && duplicate.organizationId !== organizationId)
        return Promise.reject(
          new BadRequestException('Payment organization does not match'),
        );
      if (terminalStatus) {
        if (!duplicate) return null;
        const inactive = await manager.save(SubscriptionEntity, {
          ...duplicate,
          isActive: false,
          paymentStatus: terminalStatus,
        });
        await manager.query(
          'UPDATE public.organization SET "subscriptionId" = NULL WHERE id = $1 AND "subscriptionId" = $2',
          [organizationId, duplicate.id],
        );
        return SubscriptionDomainOrmMapper.toDomain(inactive);
      }
      if (duplicate) return SubscriptionDomainOrmMapper.toDomain(duplicate);
      const pending = await manager.findOne(SubscriptionEntity, {
        where: {
          organizationId,
          mercadopagoPreferenceId: order.preference_id,
          externalReference: payment.external_reference,
          planName: plan,
        },
      });
      if (!pending || pending.mercadopagoPaymentId)
        return Promise.reject(
          new BadRequestException(
            'Payment has no matching subscription checkout',
          ),
        );
      await manager.update(
        SubscriptionEntity,
        { organizationId, isActive: true },
        { isActive: false },
      );
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);
      const saved = await manager.save(SubscriptionEntity, {
        ...pending,
        isActive: true,
        expiresAt,
        startedAt: new Date(),
        mercadopagoPaymentId: data.id,
        mercadopagoMerchantOrderId: merchantOrderId,
        paymentStatus: PaymentStatus.APPROVED,
        lastPaymentAt: new Date(),
      });
      await manager.update(OrganizationEntity, organizationId, {
        subscriptionId: saved.id,
      });
      return SubscriptionDomainOrmMapper.toDomain(saved);
    });
  }
  private getFeaturesForPlan(plan: SubscriptionPlan): Subscription['features'] {
    switch (plan) {
      case SubscriptionPlan.FREE:
        return {
          maxJobs: 5,
          maxApplications: 20,
          featuredJobs: 0,
          prioritySupport: false,
          analyticsDashboard: false,
          apiAccess: false,
        };
      case SubscriptionPlan.BASIC:
        return {
          maxJobs: 20,
          maxApplications: 100,
          featuredJobs: 1,
          prioritySupport: false,
          analyticsDashboard: true,
          apiAccess: false,
        };
      case SubscriptionPlan.PREMIUM:
        return {
          maxJobs: 50,
          maxApplications: 500,
          featuredJobs: 5,
          prioritySupport: true,
          analyticsDashboard: true,
          apiAccess: true,
        };
      case SubscriptionPlan.ENTERPRISE:
        return {
          maxJobs: -1,
          maxApplications: -1,
          featuredJobs: -1,
          prioritySupport: true,
          analyticsDashboard: true,
          apiAccess: true,
        };
      default:
        return {
          maxJobs: 5,
          maxApplications: 20,
          featuredJobs: 0,
          prioritySupport: false,
          analyticsDashboard: false,
          apiAccess: false,
        };
    }
  }
}

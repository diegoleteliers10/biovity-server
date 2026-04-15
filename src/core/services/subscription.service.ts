import {
  Injectable,
  NotFoundException,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { ISubscriptionRepository } from '../repositories/subscription.repository';
import { IOrganizationRepository } from '../repositories/organization.repository';
import {
  Subscription,
  SubscriptionPlan,
  PaymentStatus,
} from '../domain/entities/subscription.entity';

export interface CreatePreferenceInput {
  plan: string;
  organizationId: string;
}

export interface PreferenceResult {
  preferenceId: string;
  initPoint: string;
  plan: string;
  price: number;
}

export interface WebhookInput {
  id: string;
  status: string;
  external_reference: string;
  preference_id: string;
  merchant_order_id?: string;
}

const PLAN_PRICES: Record<string, number> = {
  free: 0,
  basic: 19900,
  premium: 39900,
  pro: 39900, // alias for premium
  enterprise: 89900,
};

const PLAN_DESCRIPTIONS: Record<string, string> = {
  free: 'Plan Free - 5 trabajos, 20 postulaciones',
  basic: 'Plan Basic - 20 trabajos, 100 postulaciones',
  premium: 'Plan Premium - 50 trabajos, 500 postulaciones',
  pro: 'Plan Pro - 50 trabajos, 500 postulaciones',
  enterprise: 'Plan Enterprise - Trabajos y postulaciones ilimitadas',
};

@Injectable()
export class SubscriptionService {
  private readonly mercadopagoClient: MercadoPagoConfig;

  constructor(
    @Inject('ISubscriptionRepository')
    private readonly subscriptionRepository: ISubscriptionRepository,
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
  ) {
    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN || '';
    this.mercadopagoClient = new MercadoPagoConfig({
      accessToken,
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
    if (!organization) {
      throw new NotFoundException(
        `Organization with id ${data.organizationId} not found`,
      );
    }

    const normalizedPlan = data.plan.toLowerCase();
    const price = Number(PLAN_PRICES[normalizedPlan]) || 0;
    console.log(
      'Creating preference for plan:',
      data.plan,
      '-> normalized:',
      normalizedPlan,
      'price:',
      price,
    );

    // Free plan - create subscription immediately without MP
    if (normalizedPlan === 'free') {
      const subscription = new Subscription(
        this.generateId(),
        data.organizationId,
        SubscriptionPlan.FREE,
        new Date(),
        null,
        true,
        this.getFeaturesForPlan(SubscriptionPlan.FREE),
        null,
        null,
        null,
        `${data.organizationId}:free`,
        PaymentStatus.APPROVED,
        null,
      );

      await this.subscriptionRepository.create(subscription);
      await this.organizationRepository.updateSubscription(
        data.organizationId,
        subscription.id,
      );

      return {
        preferenceId: 'free-plan',
        initPoint: '',
        plan: 'free',
        price: 0,
      };
    }

    // For paid plans, create MP preference
    const externalReference = `${data.organizationId}:${data.plan}`;
    const preferenceClient = new Preference(this.mercadopagoClient);

    const preferenceData = {
      external_reference: externalReference,
      metadata: {
        organizationId: data.organizationId,
        plan: data.plan,
      },
      items: [
        {
          id: `subscription-${data.plan}`,
          title:
            PLAN_DESCRIPTIONS[normalizedPlan] || `Suscripción ${data.plan}`,
          description: PLAN_DESCRIPTIONS[normalizedPlan],
          quantity: 1,
          unit_price: Number(price),
          currency_id: 'CLP',
        },
      ],
      payment_methods: {
        installments: 1,
      },
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
      auto_return: 'approved' as const,
      notification_url: process.env.MP_WEBHOOK_URL || '',
    };

    try {
      const result = await preferenceClient.create({ body: preferenceData });
      console.log('MP create result - init_point:', result.init_point);

      // Extract init URL
      const initUrl = result.sandbox_init_point || result.init_point || '';

      return {
        preferenceId: result.id || '',
        initPoint: initUrl,
        plan: normalizedPlan,
        price,
      };
    } catch (error) {
      console.error('MercadoPago error:', error);
      if (error instanceof Error) {
        throw new BadRequestException(`MercadoPago error: ${error.message}`);
      }
      throw new BadRequestException('Error creating MercadoPago preference');
    }
  }

  async handleWebhook(data: WebhookInput): Promise<Subscription | null> {
    const { status, external_reference, preference_id, merchant_order_id, id } =
      data;

    console.log('Webhook received:', { status, external_reference, id });

    // Parse external_reference to get organizationId and plan
    const parts = external_reference.split(':');
    if (parts.length !== 2) {
      console.error(`Invalid external_reference format: ${external_reference}`);
      return null;
    }

    const [organizationId, plan] = parts;
    const externalReference = external_reference;

    // Verify organization exists
    const organization =
      await this.organizationRepository.findById(organizationId);
    if (!organization) {
      console.error(`Organization not found: ${organizationId}`);
      return null;
    }

    // Check if subscription already exists
    const existingSubscription =
      await this.subscriptionRepository.findByOrganizationId(organizationId);
    if (existingSubscription) {
      console.log(
        `Subscription already exists for organization: ${organizationId}`,
      );
      return existingSubscription;
    }

    // Handle approved payment - create subscription
    if (status === 'approved') {
      const expiresAt = new Date();
      expiresAt.setMonth(expiresAt.getMonth() + 1);

      const planForDb =
        plan === 'pro'
          ? SubscriptionPlan.PREMIUM
          : SubscriptionPlan[plan as keyof typeof SubscriptionPlan] ||
            SubscriptionPlan.PREMIUM;

      const subscription = new Subscription(
        this.generateId(),
        organizationId,
        planForDb,
        new Date(),
        expiresAt,
        true, // isActive = true
        this.getFeaturesForPlan(planForDb),
        id.toString(),
        preference_id,
        merchant_order_id || null,
        externalReference,
        PaymentStatus.APPROVED,
        new Date(),
      );

      const createdSubscription =
        await this.subscriptionRepository.create(subscription);

      // Link subscription to organization
      await this.organizationRepository.updateSubscription(
        organizationId,
        createdSubscription.id,
      );

      console.log('Subscription created via webhook:', createdSubscription.id);
      return createdSubscription;
    }

    // Handle rejected/cancelled - create failed subscription record
    if (status === 'rejected' || status === 'cancelled') {
      const planForDb =
        plan === 'pro'
          ? SubscriptionPlan.PREMIUM
          : SubscriptionPlan[plan as keyof typeof SubscriptionPlan] ||
            SubscriptionPlan.PREMIUM;

      const subscription = new Subscription(
        this.generateId(),
        organizationId,
        planForDb,
        new Date(),
        null,
        false,
        this.getFeaturesForPlan(planForDb),
        id.toString(),
        preference_id,
        merchant_order_id || null,
        externalReference,
        status as PaymentStatus,
        new Date(),
      );

      return this.subscriptionRepository.create(subscription);
    }

    // For pending - create pending subscription
    const pendingPlan =
      plan === 'pro'
        ? SubscriptionPlan.PREMIUM
        : SubscriptionPlan[plan as keyof typeof SubscriptionPlan] ||
          SubscriptionPlan.PREMIUM;

    const pendingSubscription = new Subscription(
      this.generateId(),
      organizationId,
      pendingPlan,
      new Date(),
      null,
      false,
      this.getFeaturesForPlan(pendingPlan),
      null,
      preference_id,
      null,
      externalReference,
      PaymentStatus.PENDING,
      new Date(),
    );

    return this.subscriptionRepository.create(pendingSubscription);
  }

  private generateId(): string {
    return crypto.randomUUID();
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

import { Subscription, PaymentStatus } from '../domain/entities/index';

export interface SubscriptionFilters {
  organizationId?: string;
  planName?: string;
  isActive?: boolean;
}

export interface ISubscriptionRepository {
  create(entity: Subscription): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByOrganizationId(organizationId: string): Promise<Subscription | null>;
  findAll(filters?: SubscriptionFilters): Promise<Subscription[]>;
  update(
    id: string,
    entity: Partial<Subscription>,
  ): Promise<Subscription | null>;
  updatePaymentInfo(
    id: string,
    data: {
      mercadopagoPaymentId?: string;
      mercadopagoPreferenceId?: string;
      mercadopagoMerchantOrderId?: string;
      externalReference?: string;
      paymentStatus?: PaymentStatus;
      lastPaymentAt?: Date;
      isActive?: boolean;
      expiresAt?: Date;
    },
  ): Promise<Subscription | null>;
  delete(id: string): Promise<boolean>;
}

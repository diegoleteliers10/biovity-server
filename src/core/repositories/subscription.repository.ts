import { Subscription } from '../domain/entities/index';
import { PaymentStatus } from '../domain/enums';

export interface SubscriptionFilters {
  organizationId?: string;
  planName?: string;
  isActive?: boolean;
}

export interface SubscriptionPagination {
  take?: number;
  skip?: number;
}

export interface ISubscriptionRepository {
  create(entity: Subscription): Promise<Subscription>;
  findById(id: string): Promise<Subscription | null>;
  findByOrganizationId(organizationId: string): Promise<Subscription | null>;
  findAll(
    filters?: SubscriptionFilters,
    pagination?: SubscriptionPagination,
  ): Promise<Subscription[]>;
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

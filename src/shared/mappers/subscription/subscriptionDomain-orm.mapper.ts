import { Subscription } from '../../../core/domain/entities/subscription.entity';
import { SubscriptionEntity } from '../../../infrastructure/database/orm/subscription.entity';

export class SubscriptionDomainOrmMapper {
  static toOrm(domain: Subscription): Partial<SubscriptionEntity> {
    return {
      id: domain.id,
      organizationId: domain.organizationId,
      planName: domain.planName,
      startedAt: domain.startedAt,
      expiresAt: domain.expiresAt ?? undefined,
      isActive: domain.isActive,
      features: domain.features as unknown as Record<string, boolean>,
      mercadopagoPaymentId: domain.mercadopagoPaymentId ?? undefined,
      mercadopagoPreferenceId: domain.mercadopagoPreferenceId ?? undefined,
      mercadopagoMerchantOrderId:
        domain.mercadopagoMerchantOrderId ?? undefined,
      externalReference: domain.externalReference ?? undefined,
      paymentStatus: domain.paymentStatus,
      lastPaymentAt: domain.lastPaymentAt ?? undefined,
    };
  }

  static toDomain(entity: SubscriptionEntity): Subscription {
    return new Subscription(
      entity.id,
      entity.organizationId,
      entity.planName,
      entity.startedAt,
      entity.expiresAt ?? null,
      entity.isActive,
      entity.features as unknown as Subscription['features'],
      entity.mercadopagoPaymentId ?? null,
      entity.mercadopagoPreferenceId ?? null,
      entity.mercadopagoMerchantOrderId ?? null,
      entity.externalReference ?? null,
      entity.paymentStatus,
      entity.lastPaymentAt ?? null,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

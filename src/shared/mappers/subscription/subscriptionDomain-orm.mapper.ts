import { Subscription } from '../../../core/domain/entities/index';
import { SubscriptionEntity } from '../../../infrastructure/database/orm/index';

export class SubscriptionDomainOrmMapper {
  static toOrm(domain: Subscription): SubscriptionEntity {
    const subscriptionOrm = new SubscriptionEntity();
    subscriptionOrm.id = domain.id;
    subscriptionOrm.organizationId = domain.organizationId;
    subscriptionOrm.planName = domain.planName;
    subscriptionOrm.startedAt = domain.startedAt;
    subscriptionOrm.expiresAt = domain.expiresAt;
    subscriptionOrm.features = domain.features;
    subscriptionOrm.isActive = domain.isActive;

    return subscriptionOrm;
  }

  static toDomain(entity: SubscriptionEntity): Subscription {
    return new Subscription(
      entity.id,
      entity.organizationId,
      entity.planName,
      entity.startedAt,
      entity.expiresAt,
      entity.features,
      entity.isActive,
    );
  }
}

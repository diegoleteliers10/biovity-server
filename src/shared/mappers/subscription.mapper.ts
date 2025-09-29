import { Subscription } from '../../core/domain/entities/subscription.entity';
import { SubscriptionEntity } from '../../infrastructure/database/orm/subscription.entity';

export class SubscriptionMapper {
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

  static toEntity(domain: Subscription): SubscriptionEntity {
    const entity = new SubscriptionEntity();
    entity.id = domain.id;
    entity.organizationId = domain.organizationId;
    entity.planName = domain.planName;
    entity.startedAt = domain.startedAt;
    entity.expiresAt = domain.expiresAt;
    entity.features = domain.features;
    entity.isActive = domain.isActive;
    return entity;
  }
}

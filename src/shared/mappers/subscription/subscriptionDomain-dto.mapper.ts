import { Subscription } from '../../../core/domain/entities/subscription.entity';
import { SubscriptionResponseDto } from '../../../interfaces/dtos/subscription/subscription-response.dto';

export class SubscriptionDomainDtoMapper {
  static toDto(domain: Subscription): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = domain.id;
    dto.organizationId = domain.organizationId;
    dto.planName = domain.planName;
    dto.startedAt = domain.startedAt;
    dto.expiresAt = domain.expiresAt;
    dto.features = domain.features;
    dto.isActive = domain.isActive;

    return dto;
  }
}

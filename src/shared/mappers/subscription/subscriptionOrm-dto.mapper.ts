import { SubscriptionEntity } from '../../../infrastructure/database/orm/index';
import { SubscriptionResponseDto } from '../../../interfaces/dtos/subscription/subscription-response.dto';

export class SubscriptionOrmDtoMapper {
  static toDto(entity: SubscriptionEntity): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = entity.id;
    dto.organizationId = entity.organizationId;
    dto.planName = entity.planName;
    dto.startedAt = entity.startedAt;
    dto.expiresAt = entity.expiresAt;
    dto.features = entity.features;
    dto.isActive = entity.isActive;

    return dto;
  }
}

import { Subscription } from '../../../core/domain/entities/subscription.entity';
import { SubscriptionResponseDto } from '../../../interfaces/dtos/subscription/subscription-response.dto';
import { SubscriptionPlan, PaymentStatus } from '../../../core/domain/enums';

export class SubscriptionDomainDtoMapper {
  static toDto(domain: Subscription): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = domain.id;
    dto.organizationId = domain.organizationId;
    dto.planName = domain.planName;
    dto.isActive = domain.isActive;
    dto.startedAt = domain.startedAt ? domain.startedAt.toISOString() : null;
    dto.expiresAt = domain.expiresAt ? domain.expiresAt.toISOString() : null;
    dto.payment_status = domain.paymentStatus;
    dto.mercadopago_preference_id = domain.mercadopagoPreferenceId;
    dto.mercadopago_payment_id = domain.mercadopagoPaymentId;
    dto.mercadopago_merchant_order_id = domain.mercadopagoMerchantOrderId;
    dto.features = domain.features;

    return dto;
  }
}

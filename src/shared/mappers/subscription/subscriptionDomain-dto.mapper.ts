import { Subscription } from '../../../core/domain/entities/subscription.entity';
import {
  SubscriptionResponseDto,
  SubscriptionPlanDto,
  PaymentStatusDto,
} from '../../../interfaces/dtos/subscription/subscription-response.dto';

export class SubscriptionDomainDtoMapper {
  static toDto(domain: Subscription): SubscriptionResponseDto {
    const dto = new SubscriptionResponseDto();
    dto.id = domain.id;
    dto.organizationId = domain.organizationId;
    dto.planName = domain.planName as unknown as SubscriptionPlanDto;
    dto.isActive = domain.isActive;
    dto.startedAt = domain.startedAt ? domain.startedAt.toISOString() : null;
    dto.expiresAt = domain.expiresAt ? domain.expiresAt.toISOString() : null;
    dto.payment_status = domain.paymentStatus as unknown as PaymentStatusDto;
    dto.mercadopago_preference_id = domain.mercadopagoPreferenceId;
    dto.mercadopago_payment_id = domain.mercadopagoPaymentId;
    dto.mercadopago_merchant_order_id = domain.mercadopagoMerchantOrderId;
    dto.features = domain.features;

    return dto;
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { SubscriptionService } from '../../../core/services/subscription.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  THROTTLE_SUBSCRIPTION_LIMIT,
  THROTTLE_TTL_MS,
} from '../../../shared/constants/throttling';
import { SubscriptionDomainDtoMapper } from '../../../shared/mappers/subscription/subscriptionDomain-dto.mapper';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  SubscriptionResponseDto,
  CreatePreferenceDto,
  CreatePreferenceResponseDto,
} from '../../dtos/subscription/subscription-response.dto';

@ApiTags('subscriptions')
@Throttle({
  default: { limit: THROTTLE_SUBSCRIPTION_LIMIT, ttl: THROTTLE_TTL_MS },
})
@Controller('subscription')
export class SubscriptionController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  @Roles('organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener suscripción por organizationId' })
  @ApiQuery({
    name: 'organizationId',
    required: true,
    type: String,
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Suscripción encontrada',
    type: SubscriptionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Suscripción no encontrada' })
  async getSubscription(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<{ subscription: SubscriptionResponseDto | null }> {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    const subscription =
      await this.subscriptionService.getSubscriptionByOrganizationId(
        organizationId,
      );
    return {
      subscription: subscription
        ? SubscriptionDomainDtoMapper.toDto(subscription)
        : null,
    };
  }

  @Post('preference')
  @Roles('organization')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear preferencia de pago MercadoPago' })
  @ApiBody({ type: CreatePreferenceDto })
  @ApiResponse({
    status: 201,
    description: 'Preferencia creada exitosamente',
    type: CreatePreferenceResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createPreference(
    @Body() dto: CreatePreferenceDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<CreatePreferenceResponseDto> {
    await this.organizationAccess.assertAccess(
      dto.organizationId,
      requester,
      'manage',
    );
    const result = await this.subscriptionService.createMercadoPagoPreference({
      plan: dto.plan,
      organizationId: dto.organizationId,
    });
    return {
      preferenceId: result.preferenceId,
      initPoint: result.initPoint,
      plan: result.plan,
      price: result.price,
    };
  }

  // Mercado Pago owns this caller: no session, no rate limit (user decision).
  @SkipThrottle()
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Webhook de MercadoPago para notificaciones de pago',
  })
  @ApiQuery({
    name: 'topic',
    required: true,
    type: String,
    description: 'Topic de la notificación (payment, merchant_order, etc)',
  })
  @ApiResponse({
    status: 200,
    description: 'Webhook procesado exitosamente',
  })
  async handleWebhook(
    @Query('topic') topic: string,
    @Body() body: Record<string, unknown>,
  ): Promise<{ received: boolean }> {
    if (topic === 'payment') {
      await this.subscriptionService.handleWebhook({
        id: body.id as string,
        status: body.status as string,
        external_reference: body.external_reference as string,
        preference_id: body.preference_id as string,
        merchant_order_id: body.merchant_order_id as string | undefined,
      });
    }
    return { received: true };
  }
}

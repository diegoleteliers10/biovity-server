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
import { SubscriptionDomainDtoMapper } from '../../../shared/mappers/subscription/subscriptionDomain-dto.mapper';
import {
  SubscriptionResponseDto,
  CreatePreferenceDto,
  CreatePreferenceResponseDto,
} from '../../dtos/subscription/subscription-response.dto';

@ApiTags('subscriptions')
@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get()
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
  ): Promise<{ subscription: SubscriptionResponseDto | null }> {
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
  ): Promise<CreatePreferenceResponseDto> {
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

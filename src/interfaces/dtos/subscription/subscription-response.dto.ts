import {
  IsString,
  IsObject,
  IsBoolean,
  IsUUID,
  IsOptional,
  IsDateString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum SubscriptionPlanDto {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

export enum PaymentStatusDto {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export class SubscriptionFeaturesDto {
  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  maxJobs?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  maxApplications?: number;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  featuredJobs?: number;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  prioritySupport?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  analyticsDashboard?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  apiAccess?: boolean;
}

export class SubscriptionResponseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ enum: SubscriptionPlanDto })
  @IsEnum(SubscriptionPlanDto)
  planName: SubscriptionPlanDto;

  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({ example: '2024-01-01T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  startedAt: string | null;

  @ApiPropertyOptional({ example: '2024-12-31T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  expiresAt: string | null;

  @ApiPropertyOptional({ enum: PaymentStatusDto })
  @IsOptional()
  @IsEnum(PaymentStatusDto)
  payment_status: PaymentStatusDto | null;

  @ApiPropertyOptional({ example: 'pref-xxx-xxx' })
  @IsOptional()
  @IsString()
  mercadopago_preference_id: string | null;

  @ApiPropertyOptional({ example: '123456789' })
  @IsOptional()
  @IsString()
  mercadopago_payment_id: string | null;

  @ApiPropertyOptional({ example: '567890123' })
  @IsOptional()
  @IsString()
  mercadopago_merchant_order_id: string | null;

  @ApiPropertyOptional({ type: SubscriptionFeaturesDto })
  @IsOptional()
  @IsObject()
  features: SubscriptionFeaturesDto;
}

export class SubscriptionWithOrganizationResponseDto {
  @ApiProperty({ type: SubscriptionResponseDto })
  subscription: SubscriptionResponseDto | null;
}

export class SubscriptionCreateDto {
  @ApiProperty({ format: 'uuid', description: 'ID de la organización' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ enum: SubscriptionPlanDto, description: 'Nombre del plan' })
  @IsEnum(SubscriptionPlanDto)
  planName: SubscriptionPlanDto;
}

export class CreatePreferenceDto {
  @ApiProperty({ example: 'pro', description: 'Nombre del plan' })
  @IsString()
  plan: string;

  @ApiProperty({ format: 'uuid', description: 'ID de la organización' })
  @IsUUID()
  organizationId: string;
}

export class CreatePreferenceResponseDto {
  @ApiProperty({ example: 'pref-xxx-xxx' })
  @IsString()
  preferenceId: string;

  @ApiProperty({ example: 'https://www.mercadopago.com/...' })
  @IsString()
  initPoint: string;

  @ApiPropertyOptional({ example: 'pro' })
  @IsOptional()
  @IsString()
  plan?: string;

  @ApiPropertyOptional({ example: 40000 })
  @IsOptional()
  price?: number;
}

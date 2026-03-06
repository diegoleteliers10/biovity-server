import { IsString, IsObject, IsDate, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriptionResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  organizationId: string;

  @IsDate()
  @Type(() => Date)
  startedAt: Date;

  @IsDate()
  @Type(() => Date)
  expiresAt: Date;

  @IsObject()
  features: Record<string, boolean>;

  @IsBoolean()
  isActive: boolean;

  @IsString()
  planName: string;
}

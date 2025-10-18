import { IsString, IsArray, IsDate, IsBoolean, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class SubscriptionResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  planName: string;

  @IsDate()
  @Type(() => Date)
  startedAt: Date;

  @IsDate()
  @Type(() => Date)
  expiresAt: Date;

  @IsArray()
  @IsString({ each: true })
  features: string[];

  @IsBoolean()
  isActive: boolean;
}

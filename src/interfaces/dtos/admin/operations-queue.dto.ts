import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export const OPERATIONS_QUEUE_TYPES = [
  'all',
  'expired_job',
  'application_follow_up',
  'organization_without_active_jobs',
] as const;
export type OperationsQueueType = (typeof OPERATIONS_QUEUE_TYPES)[number];

export class OperationsQueueQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1;

  @ApiPropertyOptional({ default: 20, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;

  @ApiPropertyOptional({ enum: OPERATIONS_QUEUE_TYPES, default: 'all' })
  @IsOptional()
  @IsIn(OPERATIONS_QUEUE_TYPES)
  type: OperationsQueueType = 'all';

  @ApiPropertyOptional({ maxLength: 200 })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;
}

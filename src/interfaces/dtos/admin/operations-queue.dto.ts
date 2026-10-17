import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';

export const OPERATIONS_QUEUE_TYPES = [
  'all',
  'expired_job',
  'application_follow_up',
  'organization_without_active_jobs',
  'organization_onboarding',
  'offer_response_email',
  'application_status_notification',
  'application_created_notification',
  'event_change_notification',
  'event_lifecycle_notification',
  'message_notification',
  'interview_reminder_notification',
  'system_broadcast_notification',
  'saved_search_alert',
  'saved_search_match',
  'ai_explanation',
] as const;
export type OperationsQueueType = (typeof OPERATIONS_QUEUE_TYPES)[number];
export const OPERATIONS_QUEUE_ASSIGNMENTS = [
  'all',
  'assigned',
  'unassigned',
] as const;
export type OperationsQueueAssignment =
  (typeof OPERATIONS_QUEUE_ASSIGNMENTS)[number];

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

  @ApiPropertyOptional({ enum: OPERATIONS_QUEUE_ASSIGNMENTS, default: 'all' })
  @IsOptional()
  @IsIn(OPERATIONS_QUEUE_ASSIGNMENTS)
  assignment: OperationsQueueAssignment = 'all';
}

export class UpdateOrganizationOnboardingAssignmentDto {
  @ApiProperty({ enum: ['claim', 'schedule_follow_up', 'release'] })
  @IsIn(['claim', 'schedule_follow_up', 'release'])
  action: 'claim' | 'schedule_follow_up' | 'release';

  @ApiPropertyOptional({ maxLength: 160 })
  @ValidateIf(
    (input: UpdateOrganizationOnboardingAssignmentDto) =>
      input.action !== 'release',
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nextAction?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-10-20' })
  @ValidateIf(
    (input: UpdateOrganizationOnboardingAssignmentDto) =>
      input.action !== 'release',
  )
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetDate?: string;
}

export class UpdateAdminOperationsTaskAssignmentDto {
  @ApiProperty({ enum: ['claim', 'schedule_follow_up', 'release'] })
  @IsIn(['claim', 'schedule_follow_up', 'release'])
  action: 'claim' | 'schedule_follow_up' | 'release';

  @ApiPropertyOptional({ maxLength: 160 })
  @ValidateIf(
    (input: UpdateAdminOperationsTaskAssignmentDto) =>
      input.action !== 'release',
  )
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nextAction?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-10-20' })
  @ValidateIf(
    (input: UpdateAdminOperationsTaskAssignmentDto) =>
      input.action !== 'release',
  )
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  targetDate?: string;
}

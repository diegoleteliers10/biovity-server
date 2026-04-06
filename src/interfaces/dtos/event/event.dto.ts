import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EventTypeDto {
  INTERVIEW = 'interview',
  TASK_DEADLINE = 'task_deadline',
  ANNOUNCEMENT = 'announcement',
  ONBOARDING = 'onboarding',
}

export class EventCreateDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventTypeDto)
  type: 'interview' | 'task_deadline' | 'announcement' | 'onboarding';

  @IsDateString()
  startAt: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @IsUUID()
  organizerId: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string;
}

export class EventUpdateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EventTypeDto)
  type?: 'interview' | 'task_deadline' | 'announcement' | 'onboarding';

  @IsOptional()
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @IsOptional()
  @IsString()
  status?: 'scheduled' | 'completed' | 'cancelled';
}

export class EventQueryDto {
  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  organizerId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsEnum(EventTypeDto)
  type?: 'interview' | 'task_deadline' | 'announcement' | 'onboarding';

  @IsOptional()
  @IsString()
  status?: 'scheduled' | 'completed' | 'cancelled';

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

export class EventResponseDto {
  id: string;
  title: string;
  description: string | null;
  type: 'interview' | 'task_deadline' | 'announcement' | 'onboarding';
  startAt: Date;
  endAt: Date | null;
  location: string | null;
  meetingUrl: string | null;
  status: 'scheduled' | 'completed' | 'cancelled';
  organizerId: string;
  candidateId: string | null;
  applicationId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export class EventNoteCreateDto {
  @IsString()
  content: string;

  @IsUUID()
  authorId: string;
}

export class EventNoteResponseDto {
  id: string;
  eventId: string;
  authorId: string;
  content: string;
  createdAt: Date;
}

import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsDateString,
  IsTimeZone,
  IsArray,
  ArrayUnique,
  ArrayMaxSize,
  ValidateNested,
  ValidateIf,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  EventType,
  EventStatus,
  ParticipantStatus,
} from '../../../core/domain/enums';

export class EventCreateDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Matches(/^[A-Za-z]/)
  @IsTimeZone()
  timeZone?: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(EventType)
  type: EventType;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum({ BIOVITY: 'biovity', GOOGLE: 'google' })
  calendarProvider?: 'biovity' | 'google';

  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  @IsDateString()
  startAt: string;

  @IsOptional()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
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
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  applicationId?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  interviewerIds?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique((assignment: EventInterviewerAssignmentDto) => assignment.userId)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => EventInterviewerAssignmentDto)
  interviewerAssignments?: EventInterviewerAssignmentDto[];
}

export class EventInterviewerAssignmentDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  roleId: string;
}

export class EventUpdateDto {
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsEnum({ BIOVITY: 'biovity', GOOGLE: 'google' })
  calendarProvider?: 'biovity' | 'google';
  @ValidateIf((_object, value: unknown) => value !== undefined)
  @Matches(/^[A-Za-z]/)
  @IsTimeZone()
  timeZone?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  @IsDateString()
  startAt?: string;

  @IsOptional()
  @Matches(/(?:Z|[+-]\d{2}:\d{2})$/)
  @IsDateString()
  endAt?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  meetingUrl?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
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
  organizationId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

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
  calendarProvider: 'biovity' | 'google';
  timeZone: string;
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
  organizationId: string | null;
  candidateId: string | null;
  applicationId: string | null;
  createdAt: Date;
  updatedAt: Date;
  participants: EventParticipantDto[];
}

export class EventParticipantDto {
  id: string;
  eventId: string;
  userId: string;
  role: 'organizer' | 'attendee' | 'guest';
  status: 'pending' | 'accepted' | 'declined';
  createdAt: Date;
}

export class RsvpUpdateDto {
  @IsEnum(ParticipantStatus)
  status: ParticipantStatus;
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

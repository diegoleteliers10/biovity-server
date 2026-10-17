import { Event, EventNote } from '../../domain/entities/event.entity';
import { EventChangeHistory } from '../../domain/entities/event-change-history';
import { EventType, EventStatus, ParticipantStatus } from '../../domain/enums';
import type { EventParticipantStatusHistory } from '../../repositories/event-participant.repository';

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface EventFilters {
  organizerId?: string;
  organizationId?: string;
  candidateId?: string;
  applicationId?: string;
  userId?: string;
  type?: EventType;
  status?: EventStatus;
  from?: Date;
  to?: Date;
}

export interface IEventUseCase {
  createEvent(data: CreateEventInput): Promise<Event>;
  getEventById(id: string): Promise<Event | null>;
  getEvents(
    filters?: EventFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Event>>;
  updateEvent(
    id: string,
    data: UpdateEventInput,
    actorUserId: string,
  ): Promise<Event | null>;
  updateParticipantStatus(
    eventId: string,
    userId: string,
    status: ParticipantStatus,
  ): Promise<Event | null>;
  getParticipantStatusHistory(
    eventId: string,
    userId: string,
  ): Promise<EventParticipantStatusHistory[] | null>;
  deleteEvent(id: string, actorUserId: string): Promise<boolean>;
  getEventChangeHistory(id: string): Promise<EventChangeHistory[]>;
  createNote(eventId: string, data: CreateNoteInput): Promise<EventNote>;
  getNotes(eventId: string): Promise<EventNote[]>;
  deleteNote(id: string): Promise<boolean>;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  type: EventType;
  startAt: Date;
  timeZone?: string;
  endAt?: Date;
  location?: string;
  meetingUrl?: string;
  organizerId: string;
  organizationId?: string;
  candidateId?: string;
  applicationId?: string;
  interviewerIds?: string[];
  interviewerAssignments?: Array<{ userId: string; roleId: string }>;
  calendarProvider?: 'biovity' | 'google';
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  type?: EventType;
  startAt?: Date;
  timeZone?: string;
  endAt?: Date;
  location?: string;
  meetingUrl?: string;
  status?: EventStatus;
  calendarProvider?: 'biovity' | 'google';
}

export interface CreateNoteInput {
  authorId: string;
  content: string;
}

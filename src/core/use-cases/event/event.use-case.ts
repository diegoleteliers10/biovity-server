import {
  Event,
  EventNote,
  EventType,
  EventStatus,
} from '../../domain/entities/event.entity';

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
  updateEvent(id: string, data: UpdateEventInput): Promise<Event | null>;
  deleteEvent(id: string): Promise<boolean>;
  createNote(eventId: string, data: CreateNoteInput): Promise<EventNote>;
  getNotes(eventId: string): Promise<EventNote[]>;
  deleteNote(id: string): Promise<boolean>;
}

export interface CreateEventInput {
  title: string;
  description?: string;
  type: EventType;
  startAt: Date;
  endAt?: Date;
  location?: string;
  meetingUrl?: string;
  organizerId: string;
  organizationId?: string;
  candidateId?: string;
  applicationId?: string;
}

export interface UpdateEventInput {
  title?: string;
  description?: string;
  type?: EventType;
  startAt?: Date;
  endAt?: Date;
  location?: string;
  meetingUrl?: string;
  status?: EventStatus;
}

export interface CreateNoteInput {
  authorId: string;
  content: string;
}
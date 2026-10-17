import { Event, EventNote } from '../domain/entities/event.entity';
import type {
  EventChangeAction,
  EventChangeHistory,
} from '../domain/entities/event-change-history';

export type EventChangeResult =
  | { kind: 'not_found' }
  | { kind: 'closed' }
  | { kind: 'unchanged'; event: Event }
  | { kind: 'changed'; event: Event; action: EventChangeAction };

export interface EventFilters {
  organizerId?: string;
  organizationId?: string;
  candidateId?: string;
  applicationId?: string;
  userId?: string;
  type?: 'interview' | 'task_deadline' | 'announcement' | 'onboarding';
  status?: 'scheduled' | 'completed' | 'cancelled';
  from?: Date;
  to?: Date;
}

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

export interface IEventRepository {
  create(entity: Event): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  findAll(
    filters?: EventFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Event>>;
  update(id: string, entity: Partial<Event>): Promise<Event | null>;
  updateWithHistory(
    id: string,
    entity: Partial<Event>,
    actorUserId: string,
  ): Promise<EventChangeResult>;
  cancelWithHistory(
    id: string,
    actorUserId: string,
  ): Promise<EventChangeResult>;
  findChangeHistory(id: string): Promise<EventChangeHistory[]>;
  delete(id: string): Promise<boolean>;

  // Notes
  createNote(note: EventNote): Promise<EventNote>;
  findNotesByEventId(eventId: string): Promise<EventNote[]>;
  deleteNote(id: string): Promise<boolean>;
}

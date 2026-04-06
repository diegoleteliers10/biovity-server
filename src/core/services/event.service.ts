import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IEventRepository } from '../repositories/event.repository';
import {
  IEventUseCase,
  CreateEventInput,
  UpdateEventInput,
  CreateNoteInput,
} from '../use-cases/event/event.use-case';
import { Event, EventNote, EventStatus } from '../domain/entities/event.entity';

@Injectable()
export class EventService implements IEventUseCase {
  constructor(
    @Inject('IEventRepository')
    private readonly eventRepository: IEventRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createEvent(data: CreateEventInput): Promise<Event> {
    const event = new Event(
      this.generateId(),
      data.title,
      data.description || null,
      data.type,
      data.startAt,
      data.endAt || null,
      data.location || null,
      data.meetingUrl || null,
      EventStatus.SCHEDULED,
      data.organizerId,
      data.candidateId || null,
      data.applicationId || null,
      new Date(),
      new Date(),
    );

    return this.eventRepository.create(event);
  }

  async getEventById(id: string): Promise<Event | null> {
    return this.eventRepository.findById(id);
  }

  async getEvents(
    filters?: {
      organizerId?: string;
      candidateId?: string;
      userId?: string;
      type?: 'interview' | 'task_deadline' | 'announcement' | 'onboarding';
      status?: 'scheduled' | 'completed' | 'cancelled';
      from?: Date;
      to?: Date;
    },
    pagination?: { page?: number; limit?: number },
  ): Promise<{
    data: Event[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.eventRepository.findAll(filters, pagination);
  }

  async updateEvent(id: string, data: UpdateEventInput): Promise<Event | null> {
    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    const partial: Partial<Event> = {};
    if (data.title !== undefined) partial.title = data.title;
    if (data.description !== undefined) partial.description = data.description;
    if (data.type !== undefined) partial.type = data.type;
    if (data.startAt !== undefined) partial.startAt = data.startAt;
    if (data.endAt !== undefined) partial.endAt = data.endAt;
    if (data.location !== undefined) partial.location = data.location;
    if (data.meetingUrl !== undefined) partial.meetingUrl = data.meetingUrl;
    if (data.status !== undefined) partial.status = data.status;

    return this.eventRepository.update(id, partial);
  }

  async deleteEvent(id: string): Promise<boolean> {
    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    // Soft delete - set status to cancelled
    return this.eventRepository.update(id, {
      status: EventStatus.CANCELLED,
    }).then(() => true);
  }

  async createNote(eventId: string, data: CreateNoteInput): Promise<EventNote> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    const note = new EventNote(
      this.generateId(),
      eventId,
      data.authorId,
      data.content,
      new Date(),
    );

    return this.eventRepository.createNote(note);
  }

  async getNotes(eventId: string): Promise<EventNote[]> {
    return this.eventRepository.findNotesByEventId(eventId);
  }

  async deleteNote(id: string): Promise<boolean> {
    return this.eventRepository.deleteNote(id);
  }
}

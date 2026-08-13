import {
  Injectable,
  NotFoundException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IEventRepository } from '../repositories/event.repository';
import {
  IEventParticipantRepository,
  EVENT_PARTICIPANT_REPOSITORY,
} from '../repositories/event-participant.repository';
import { IUserRepository } from '../repositories/user.repository';
import {
  IEventUseCase,
  CreateEventInput,
  UpdateEventInput,
  CreateNoteInput,
} from '../use-cases/event/event.use-case';
import { Event, EventNote } from '../domain/entities/event.entity';
import {
  EventStatus,
  EventType,
  NotificationType,
  ParticipantStatus,
} from '../domain/enums';
import { EventEntity } from '../../infrastructure/database/orm/event.entity';
import { EventDomainOrmMapper } from '../../shared/mappers/event/eventDomain-orm.mapper';
import { LOGGER_TOKEN } from '../../shared/logger/logger.service';
import {
  NotificationService,
  eventTypeLabel,
  formatEventDate,
} from '../../shared/notification';

const CALENDAR_LINK = '/dashboard/calendar';
const APPLICATIONS_LINK = '/dashboard/applications';

@Injectable()
export class EventService implements IEventUseCase {
  constructor(
    @Inject('IEventRepository')
    private readonly eventRepository: IEventRepository,
    @Inject(EVENT_PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IEventParticipantRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    private readonly notificationService: NotificationService,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
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
      data.organizationId || null,
      data.candidateId || null,
      data.applicationId || null,
      new Date(),
      new Date(),
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdId: string;
    try {
      const saved = await queryRunner.manager.save(
        EventEntity,
        EventDomainOrmMapper.toOrm(event),
      );
      createdId = saved.id;
      await this.participantRepository.seedParticipants(
        queryRunner.manager,
        saved.id,
        saved.organizerId,
        saved.candidateId,
      );
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const created = await this.eventRepository.findById(createdId);
    if (created) {
      await this.notifyInterviewCreated(created);
      return created;
    }
    return event;
  }

  async getEventById(id: string): Promise<Event | null> {
    return this.eventRepository.findById(id);
  }

  async getEvents(
    filters?: {
      organizerId?: string;
      candidateId?: string;
      userId?: string;
      type?: EventType;
      status?: EventStatus;
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

    const updated = await this.eventRepository.update(id, partial);
    if (!updated) {
      return null;
    }

    const wasCancelled =
      data.status === EventStatus.CANCELLED &&
      existing.status !== EventStatus.CANCELLED;

    // EXCEPTION. REASON: best-effort side-effect after successful update.
    try {
      if (wasCancelled) {
        await this.notifyEventCancelled(
          updated.id,
          updated.title,
          updated.organizerId,
        );
      } else {
        await this.notifyEventUpdated(updated, updated.organizerId);
      }
    } catch (error) {
      this.logNotificationFailure(
        wasCancelled ? 'event-cancelled' : 'event-updated',
        error,
      );
    }

    return updated;
  }

  async deleteEvent(id: string): Promise<boolean> {
    const existing = await this.eventRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Event with id ${id} not found`);
    }

    const wasAlreadyCancelled = existing.status === EventStatus.CANCELLED;
    await this.eventRepository.update(id, {
      status: EventStatus.CANCELLED,
    });

    if (!wasAlreadyCancelled) {
      try {
        await this.notifyEventCancelled(
          existing.id,
          existing.title,
          existing.organizerId,
        );
      } catch (error) {
        this.logNotificationFailure('event-cancelled', error);
      }
    }

    return true;
  }

  async updateParticipantStatus(
    eventId: string,
    userId: string,
    status: ParticipantStatus,
  ): Promise<Event | null> {
    const event = await this.eventRepository.findById(eventId);
    if (!event) {
      throw new NotFoundException(`Event with id ${eventId} not found`);
    }

    // SECURITY TODO: enforce 403 when path userId != authenticated principal.
    // The backend currently has no real auth (JwtAuthGuard is an unused stub),
    // so the path userId is trusted. Wire a Passport JWT strategy + guard and
    // compare against req.user.id before shipping to production.

    const existingParticipant =
      await this.participantRepository.findByEventAndUser(eventId, userId);
    if (!existingParticipant) {
      throw new NotFoundException(
        `Participant ${userId} not found in event ${eventId}`,
      );
    }

    if (existingParticipant.status === status) {
      return this.eventRepository.findById(eventId);
    }

    const fromStatus = existingParticipant.status;

    const updated = await this.participantRepository.updateStatus(
      eventId,
      userId,
      status,
    );
    if (!updated) {
      throw new NotFoundException(
        `Failed to update participant ${userId} in event ${eventId}`,
      );
    }

    // EXCEPTION. REASON: best-effort side-effect after successful update.
    try {
      await this.notifyOrganizerRsvp(event, userId, fromStatus, status);
    } catch (error) {
      this.logNotificationFailure('rsvp', error);
    }

    return this.eventRepository.findById(eventId);
  }

  private async notifyInterviewCreated(event: Event): Promise<void> {
    if (!event.candidateId || event.candidateId === event.organizerId) {
      return;
    }

    // EXCEPTION. REASON: post-commit best-effort side-effect.
    try {
      const orgName = await this.userName(event.organizerId);
      await this.notificationService.create({
        userId: event.candidateId,
        type: NotificationType.INTERVIEW,
        title: 'Nueva entrevista',
        body: `${orgName} agendo ${eventTypeLabel(event.type)}: ${event.title} para ${formatEventDate(event.startAt)}`,
        link: CALENDAR_LINK,
        data: { eventId: event.id, eventType: event.type },
        dedupKey: `event:${event.id}:created`,
      });
    } catch (error) {
      this.logNotificationFailure('interview-created', error);
    }
  }

  private async notifyEventUpdated(
    event: Event,
    excludeUserId: string,
  ): Promise<void> {
    // EXCEPTION. REASON: post-commit best-effort side-effect.
    try {
      const userIds = await this.participantRepository.findUserIdsByEventId(
        event.id,
        [ParticipantStatus.DECLINED],
      );
      const recipients = userIds.filter(id => id !== excludeUserId);
      if (recipients.length === 0) {
        return;
      }

      await this.notificationService.createMany(
        recipients.map(userId => ({
          userId,
          type: NotificationType.INTERVIEW,
          title: 'Evento actualizado',
          body: `La entrevista '${event.title}' fue actualizada`,
          link: CALENDAR_LINK,
          data: { eventId: event.id },
          dedupKey: `event:${event.id}:updated:${event.updatedAt.getTime()}`,
        })),
      );
    } catch (error) {
      this.logNotificationFailure('event-updated', error);
    }
  }

  private async notifyEventCancelled(
    eventId: string,
    title: string,
    excludeUserId: string,
  ): Promise<void> {
    // EXCEPTION. REASON: post-commit best-effort side-effect.
    try {
      const userIds =
        await this.participantRepository.findUserIdsByEventId(eventId);
      const recipients = userIds.filter(id => id !== excludeUserId);
      if (recipients.length === 0) {
        return;
      }

      await this.notificationService.createMany(
        recipients.map(userId => ({
          userId,
          type: NotificationType.INTERVIEW,
          title: 'Evento cancelado',
          body: `'${title}' fue cancelado`,
          link: CALENDAR_LINK,
          data: { eventId },
          dedupKey: `event:${eventId}:cancelled`,
        })),
      );
    } catch (error) {
      this.logNotificationFailure('event-cancelled', error);
    }
  }

  private async notifyOrganizerRsvp(
    event: Event,
    userId: string,
    fromStatus: ParticipantStatus,
    toStatus: ParticipantStatus,
  ): Promise<void> {
    // EXCEPTION. REASON: post-commit best-effort side-effect.
    try {
      const participantName = await this.userName(userId);
      await this.notificationService.create({
        userId: event.organizerId,
        type: NotificationType.INTERVIEW,
        title: 'Respuesta de invitacion',
        body: `${participantName} ${this.rsvpVerb(toStatus)} '${event.title}'`,
        link: APPLICATIONS_LINK,
        data: { eventId: event.id, userId, status: toStatus },
        dedupKey: `event:${event.id}:rsvp:${userId}:${fromStatus}:${toStatus}`,
      });
    } catch (error) {
      this.logNotificationFailure('rsvp', error);
    }
  }

  private async userName(userId: string): Promise<string> {
    const user = await this.userRepository.findById(userId);
    return user?.name ?? 'Alguien';
  }

  private rsvpVerb(status: ParticipantStatus): string {
    switch (status) {
      case ParticipantStatus.ACCEPTED:
        return 'acepto';
      case ParticipantStatus.DECLINED:
        return 'rechazo';
      case ParticipantStatus.PENDING:
        return 'marco como pendiente';
      default:
        return 'actualizo su respuesta a';
    }
  }

  private logNotificationFailure(operation: string, error: unknown): void {
    this.logger.error(
      `event notification failed (${operation}): ${(error as Error).message}`,
      (error as Error).stack,
      'EventService',
    );
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

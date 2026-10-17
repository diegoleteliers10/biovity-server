import {
  Injectable,
  Optional,
  ConflictException,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IEventRepository } from '../repositories/event.repository';
import {
  IEventParticipantRepository,
  EventParticipantStatusHistory,
  EventInterviewerAssignment,
  EVENT_PARTICIPANT_REPOSITORY,
} from '../repositories/event-participant.repository';
import {
  IEventUseCase,
  EventFilters,
  CreateEventInput,
  UpdateEventInput,
  CreateNoteInput,
} from '../use-cases/event/event.use-case';
import { Event, EventNote } from '../domain/entities/event.entity';
import {
  GENERAL_INTERVIEW_ROLE,
  InterviewRole,
} from '../domain/entities/pipeline-stage-rubric';
import type { EventChangeHistory } from '../domain/entities/event-change-history';
import { EventStatus, EventType, ParticipantStatus } from '../domain/enums';
import { EventEntity } from '../../infrastructure/database/orm/event.entity';
import { EventDomainOrmMapper } from '../../shared/mappers/event/eventDomain-orm.mapper';
import { GoogleCalendarService } from './google-calendar.service';

@Injectable()
export class EventService implements IEventUseCase {
  constructor(
    @Inject('IEventRepository')
    private readonly eventRepository: IEventRepository,
    @Inject(EVENT_PARTICIPANT_REPOSITORY)
    private readonly participantRepository: IEventParticipantRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    @Optional()
    private readonly googleCalendar?: GoogleCalendarService,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createEvent(data: CreateEventInput): Promise<Event> {
    if (data.calendarProvider === 'google') {
      const isConnected =
        this.googleCalendar &&
        (await this.googleCalendar.isConnected(
          data.organizationId
            ? { kind: 'organization', id: data.organizationId }
            : { kind: 'user', id: data.organizerId },
        ));
      if (!isConnected) {
        return Promise.reject(
          new BadRequestException(
            'Conecta Google Calendar antes de guardar el evento allí.',
          ),
        );
      }
    }
    const legacyAssignments = data.interviewerIds ?? [];
    const requestedAssignments =
      data.interviewerAssignments ??
      legacyAssignments.map(userId => ({
        userId,
        roleId: GENERAL_INTERVIEW_ROLE.id,
      }));
    if (
      (data.interviewerAssignments?.length && legacyAssignments.length) ||
      new Set(requestedAssignments.map(assignment => assignment.userId))
        .size !== requestedAssignments.length ||
      (data.type !== EventType.INTERVIEW && requestedAssignments.length > 0)
    ) {
      return Promise.reject(
        new BadRequestException(
          'Las asignaciones de entrevistadores no son válidas.',
        ),
      );
    }
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
      [],
      data.timeZone ?? 'America/Santiago',
      null,
      null,
      null,
      data.calendarProvider ?? 'biovity',
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdId: string;
    try {
      let allowedRoles: InterviewRole[] = [GENERAL_INTERVIEW_ROLE];
      if (data.type === EventType.INTERVIEW && data.applicationId) {
        const stageRows = await queryRunner.query(
          `SELECT stage.id AS pipeline_stage_id,
                  stage.name AS pipeline_stage_name_snapshot,
                  stage.current_rubric_version_id AS rubric_version_id,
                  rubric.roles
           FROM application candidate_application
           JOIN pipeline_stage stage
             ON stage.id = candidate_application.pipeline_stage_id
           LEFT JOIN pipeline_stage_rubric_version rubric
             ON rubric.id = stage.current_rubric_version_id
           WHERE candidate_application.id = $1::uuid
           FOR SHARE OF candidate_application, stage`,
          [data.applicationId],
        );
        const stage = stageRows[0];
        if (stage) {
          event.pipelineStageId = stage.pipeline_stage_id;
          event.pipelineStageNameSnapshot = stage.pipeline_stage_name_snapshot;
          event.rubricVersionId = stage.rubric_version_id;
          allowedRoles = stage.roles ?? allowedRoles;
        }
      }
      const assignments: EventInterviewerAssignment[] = [];
      for (const requested of requestedAssignments) {
        const role = allowedRoles.find(item => item.id === requested.roleId);
        if (!role || requested.userId === data.candidateId) {
          await queryRunner.rollbackTransaction();
          return Promise.reject(
            new BadRequestException(
              'El rol de entrevista o la persona asignada no es válido.',
            ),
          );
        }
        assignments.push({ ...requested, roleLabel: role.label });
      }
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
        [],
        data.type === EventType.INTERVIEW,
        assignments,
      );
      await queryRunner.manager.query(
        `INSERT INTO event_lifecycle_notification_intent
          (kind, event_id, participant_id, recipient_id, event_title, event_type,
           event_start_at, event_time_zone, actor_user_id, actor_name, dedup_key)
         SELECT 'created', event.id, participant.id, participant.user_id,
                event.title, event.type, event."startAt", event."timeZone",
                event."organizerId", organizer.name,
                'event:' || event.id::text || ':created:' || participant.user_id::text
         FROM event
         JOIN event_participant participant ON participant.event_id = event.id
         JOIN "user" organizer ON organizer.id = event."organizerId"
         WHERE event.id = $1::uuid
           AND participant.user_id <> event."organizerId"
           AND participant.status <> 'declined'
         ON CONFLICT (dedup_key) DO NOTHING`,
        [saved.id],
      );
      if (data.type === EventType.INTERVIEW) {
        await queryRunner.manager.query(
          `INSERT INTO interview_reminder_notification_intent
            (event_id, participant_id, scheduled_start_at, available_at)
           SELECT event.id, participant.id, event."startAt",
                  event."startAt" - interval '24 hours'
           FROM event
           JOIN event_participant participant ON participant.event_id = event.id
           WHERE event.id = $1::uuid AND event."startAt" > now()
           ON CONFLICT (event_id, participant_id, scheduled_start_at) DO NOTHING`,
          [saved.id],
        );
      }
      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    const created = await this.eventRepository.findById(createdId);
    const savedEvent = created ?? event;
    if (this.googleCalendar && savedEvent.calendarProvider === 'google')
      await this.googleCalendar.syncEvent(savedEvent);
    return savedEvent;
  }

  async getEventById(id: string): Promise<Event | null> {
    return this.eventRepository.findById(id);
  }

  async getEvents(
    filters?: EventFilters,
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

  async updateEvent(
    id: string,
    data: UpdateEventInput,
    actorUserId: string,
  ): Promise<Event | null> {
    let previousEvent: Event | null = null;
    if (data.calendarProvider === 'google') {
      const currentEvent = await this.eventRepository.findById(id);
      if (!currentEvent)
        return Promise.reject(
          new NotFoundException(`Event with id ${id} not found`),
        );
      const isConnected =
        this.googleCalendar &&
        (await this.googleCalendar.isConnected(
          currentEvent.organizationId
            ? { kind: 'organization', id: currentEvent.organizationId }
            : { kind: 'user', id: currentEvent.organizerId },
        ));
      if (!isConnected) {
        return Promise.reject(
          new BadRequestException(
            'Conecta Google Calendar antes de guardar el evento allí.',
          ),
        );
      }
      previousEvent = currentEvent;
    } else if (data.calendarProvider === 'biovity') {
      previousEvent = await this.eventRepository.findById(id);
    }
    const partial: Partial<Event> = {};
    if (data.title !== undefined) partial.title = data.title;
    if (data.description !== undefined) partial.description = data.description;
    if (data.type !== undefined) partial.type = data.type;
    if (data.timeZone !== undefined) partial.timeZone = data.timeZone;
    if (data.startAt !== undefined) partial.startAt = data.startAt;
    if (data.endAt !== undefined) partial.endAt = data.endAt;
    if (data.location !== undefined) partial.location = data.location;
    if (data.meetingUrl !== undefined) partial.meetingUrl = data.meetingUrl;
    if (data.status !== undefined) partial.status = data.status;
    if (data.calendarProvider !== undefined)
      partial.calendarProvider = data.calendarProvider;

    const result = await this.eventRepository.updateWithHistory(
      id,
      partial,
      actorUserId,
    );
    if (result.kind === 'not_found') {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    if (result.kind === 'closed') {
      throw new ConflictException(
        'No puedes cambiar un evento completado o cancelado.',
      );
    }
    if (result.kind === 'unchanged') return result.event;

    if (this.googleCalendar && result.event.calendarProvider === 'google')
      await this.googleCalendar.syncEvent(result.event);
    else if (
      this.googleCalendar &&
      result.event.calendarProvider === 'biovity' &&
      previousEvent?.calendarProvider === 'google'
    )
      await this.googleCalendar.removeEventFromGoogle(previousEvent);
    return result.event;
  }

  async deleteEvent(id: string, actorUserId: string): Promise<boolean> {
    const result = await this.eventRepository.cancelWithHistory(
      id,
      actorUserId,
    );
    if (result.kind === 'not_found') {
      throw new NotFoundException(`Event with id ${id} not found`);
    }
    if (result.kind === 'closed') {
      throw new ConflictException(
        'No puedes cancelar un evento que ya se completó.',
      );
    }
    if (result.kind === 'unchanged') return true;

    if (this.googleCalendar && result.event.calendarProvider === 'google')
      await this.googleCalendar.syncEvent(result.event);
    return true;
  }

  async getEventChangeHistory(id: string): Promise<EventChangeHistory[]> {
    return this.eventRepository.findChangeHistory(id);
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

    const change = await this.participantRepository.updateStatus(
      eventId,
      userId,
      status,
      userId,
    );
    if (!change) {
      throw new NotFoundException(
        `Participant ${userId} not found in event ${eventId}`,
      );
    }
    if (change.kind === 'closed') {
      throw new ConflictException(
        'La respuesta ya no se puede cambiar porque el evento comenzó o terminó.',
      );
    }

    if (change.kind === 'unchanged') {
      return this.eventRepository.findById(eventId);
    }

    return this.eventRepository.findById(eventId);
  }

  async getParticipantStatusHistory(
    eventId: string,
    userId: string,
  ): Promise<EventParticipantStatusHistory[] | null> {
    const participant = await this.participantRepository.findByEventAndUser(
      eventId,
      userId,
    );
    if (!participant) return null;
    return this.participantRepository.findStatusHistory(eventId, userId);
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

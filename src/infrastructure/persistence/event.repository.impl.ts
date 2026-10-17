import { Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  EventChangeHistoryEntity,
  EventEntity,
  EventNoteEntity,
} from '../database/orm';
import { Event, EventNote } from '../../core/domain/entities/event.entity';
import type {
  EventChangeField,
  EventChangeHistory,
  EventChangeSet,
} from '../../core/domain/entities/event-change-history';
import { EventStatus, EventType } from '../../core/domain/enums';
import type {
  EventChangeResult,
  IEventRepository,
  EventFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../core/repositories/event.repository';
import { EventDomainOrmMapper } from '../../shared/mappers/event/eventDomain-orm.mapper';

@Injectable()
export class EventRepositoryImpl implements IEventRepository {
  constructor(
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(EventNoteEntity)
    private readonly noteRepository: Repository<EventNoteEntity>,
    @InjectRepository(EventChangeHistoryEntity)
    private readonly historyRepository: Repository<EventChangeHistoryEntity>,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private normalizeChangeValue(value: string | Date | null): string | null {
    return value instanceof Date ? value.toISOString() : value;
  }

  private buildChangeSet(
    current: EventEntity,
    patch: Partial<Event>,
  ): EventChangeSet {
    const changes: EventChangeSet = {};
    const record = (
      field: EventChangeField,
      from: string | Date | null,
      to: string | Date | null | undefined,
    ): void => {
      if (to === undefined) return;
      const fromValue = this.normalizeChangeValue(from);
      const toValue = this.normalizeChangeValue(to);
      if (fromValue === toValue) return;
      changes[field] = { from: fromValue, to: toValue };
    };

    record('title', current.title, patch.title);
    record('description', current.description, patch.description);
    record('type', current.type, patch.type);
    record('timeZone', current.timeZone, patch.timeZone);
    record('startAt', current.startAt, patch.startAt);
    record('endAt', current.endAt, patch.endAt);
    record('location', current.location, patch.location);
    record('meetingUrl', current.meetingUrl, patch.meetingUrl);
    record('status', current.status, patch.status);
    record(
      'calendarProvider',
      current.calendarProvider,
      patch.calendarProvider,
    );
    return changes;
  }

  private async persistChange(
    id: string,
    patch: Partial<Event>,
    actorUserId: string,
  ): Promise<EventChangeResult> {
    return this.dataSource.transaction(async manager => {
      const eventRepository = manager.getRepository(EventEntity);
      const current = await eventRepository.findOne({
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!current) return { kind: 'not_found' };

      const changes = this.buildChangeSet(current, patch);
      if (Object.keys(changes).length === 0) {
        return {
          kind: 'unchanged',
          event: EventDomainOrmMapper.toDomain(current),
        };
      }
      if (current.status !== EventStatus.SCHEDULED) return { kind: 'closed' };

      const action =
        changes.status?.to === EventStatus.CANCELLED ? 'cancelled' : 'updated';
      const saved = await eventRepository.save({
        ...current,
        ...patch,
        updatedAt: new Date(),
      });
      const history = await manager
        .getRepository(EventChangeHistoryEntity)
        .save({
          eventId: id,
          actorUserId,
          action,
          changes,
        });
      await manager.query(
        `INSERT INTO event_change_notification_intent
          (change_history_id, event_id, recipient_id, action, event_title)
         SELECT $1::uuid, event.id, participant.user_id, $2, $3
         FROM event_participant participant
         JOIN event ON event.id = participant.event_id
         WHERE participant.event_id = $4::uuid
           AND participant.user_id <> $5::uuid
           AND ($2 = 'cancelled' OR participant.status <> 'declined')
         ON CONFLICT (change_history_id, recipient_id) DO NOTHING`,
        [history.id, action, saved.title, id, saved.organizerId],
      );
      if (
        saved.status !== EventStatus.SCHEDULED ||
        (saved.type !== EventType.INTERVIEW &&
          (current.type === EventType.INTERVIEW ||
            changes.status?.to === EventStatus.CANCELLED))
      ) {
        await manager.query(
          `UPDATE interview_reminder_notification_intent
           SET status = 'cancelled', locked_at = NULL, updated_at = now()
           WHERE event_id = $1::uuid AND status IN ('pending', 'retry')`,
          [id],
        );
      } else if (
        saved.type === EventType.INTERVIEW &&
        saved.status === EventStatus.SCHEDULED &&
        (changes.startAt || changes.type?.to === EventType.INTERVIEW)
      ) {
        await manager.query(
          `UPDATE interview_reminder_notification_intent
           SET status = 'cancelled', locked_at = NULL, updated_at = now()
           WHERE event_id = $1::uuid AND scheduled_start_at <> $2
             AND status IN ('pending', 'retry')`,
          [id, saved.startAt],
        );
        if (
          saved.type === EventType.INTERVIEW &&
          saved.status === EventStatus.SCHEDULED
        ) {
          await manager.query(
            `INSERT INTO interview_reminder_notification_intent
              (event_id, participant_id, scheduled_start_at, available_at)
             SELECT event.id, participant.id, event."startAt",
                    event."startAt" - interval '24 hours'
             FROM event
             JOIN event_participant participant ON participant.event_id = event.id
             WHERE event.id = $1::uuid AND event."startAt" > now()
             ON CONFLICT (event_id, participant_id, scheduled_start_at) DO NOTHING`,
            [id],
          );
        }
      }

      return {
        kind: 'changed',
        event: EventDomainOrmMapper.toDomain(saved),
        action,
      };
    });
  }

  async create(entity: Event): Promise<Event> {
    const eventOrm = EventDomainOrmMapper.toOrm(entity);
    const saved = await this.eventRepository.save(eventOrm);
    return EventDomainOrmMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Event | null> {
    const eventOrm = await this.eventRepository.findOne({
      where: { id },
      relations: {
        organizer: true,
        candidate: true,
        notes: true,
        participants: true,
      },
    });
    return eventOrm ? EventDomainOrmMapper.toDomain(eventOrm) : null;
  }

  async findAll(
    filters?: EventFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Event>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    const queryBuilder = this.eventRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.organizer', 'organizer')
      .leftJoinAndSelect('event.candidate', 'candidate');

    if (filters?.organizerId) {
      queryBuilder.andWhere('event.organizerId = :organizerId', {
        organizerId: filters.organizerId,
      });
    }

    if (filters?.organizationId) {
      queryBuilder.andWhere('event.organizationId = :organizationId', {
        organizationId: filters.organizationId,
      });
    }

    if (filters?.candidateId) {
      queryBuilder.andWhere('event.candidateId = :candidateId', {
        candidateId: filters.candidateId,
      });
    }

    if (filters?.applicationId) {
      queryBuilder.andWhere(
        `event.applicationId = :applicationId AND EXISTS (
          SELECT 1 FROM application AS application
          JOIN job AS job ON job.id = application."jobId"
          WHERE application.id = event.applicationId
            AND job."organizationId" = event.organizationId
        )`,
        { applicationId: filters.applicationId },
      );
    }

    if (filters?.userId) {
      queryBuilder.andWhere(
        `(event.organizerId = :userId OR EXISTS (SELECT 1 FROM event_participant ep WHERE ep.event_id = event.id AND ep.user_id = :userId))`,
        { userId: filters.userId },
      );
    }

    if (filters?.type) {
      queryBuilder.andWhere('event.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere('event.status = :status', {
        status: filters.status,
      });
    }

    if (filters?.from) {
      queryBuilder.andWhere('event.startAt >= :from', { from: filters.from });
    }

    if (filters?.to) {
      queryBuilder.andWhere('event.startAt <= :to', { to: filters.to });
    }

    const total = await queryBuilder.getCount();

    queryBuilder.skip(skip).take(limit).orderBy('event.startAt', 'ASC');

    const eventsOrm = await queryBuilder.getMany();
    const data = eventsOrm.map(e => EventDomainOrmMapper.toDomain(e));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, entity: Partial<Event>): Promise<Event | null> {
    const updateData: Partial<EventEntity> = {};

    if (entity.title !== undefined) updateData.title = entity.title;
    if (entity.description !== undefined)
      updateData.description = entity.description;
    if (entity.type !== undefined) updateData.type = entity.type;
    if (entity.timeZone !== undefined) updateData.timeZone = entity.timeZone;
    if (entity.startAt !== undefined) updateData.startAt = entity.startAt;
    if (entity.endAt !== undefined) updateData.endAt = entity.endAt;
    if (entity.location !== undefined) updateData.location = entity.location;
    if (entity.meetingUrl !== undefined)
      updateData.meetingUrl = entity.meetingUrl;
    if (entity.status !== undefined) updateData.status = entity.status;
    if (entity.calendarProvider !== undefined)
      updateData.calendarProvider = entity.calendarProvider;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    updateData.updatedAt = new Date();

    const result = await this.eventRepository.update(id, updateData);
    if (result.affected === 0) return null;

    return this.findById(id);
  }

  async updateWithHistory(
    id: string,
    entity: Partial<Event>,
    actorUserId: string,
  ): Promise<EventChangeResult> {
    return this.persistChange(id, entity, actorUserId);
  }

  async cancelWithHistory(
    id: string,
    actorUserId: string,
  ): Promise<EventChangeResult> {
    return this.persistChange(
      id,
      { status: EventStatus.CANCELLED },
      actorUserId,
    );
  }

  async findChangeHistory(id: string): Promise<EventChangeHistory[]> {
    return this.historyRepository.find({
      where: { eventId: id },
      order: { createdAt: 'ASC', id: 'ASC' },
    });
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.eventRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }

  // Notes
  async createNote(note: EventNote): Promise<EventNote> {
    const noteOrm = EventDomainOrmMapper.noteToOrm(note);
    const saved = await this.noteRepository.save(noteOrm);
    return EventDomainOrmMapper.noteToDomain(saved);
  }

  async findNotesByEventId(eventId: string): Promise<EventNote[]> {
    const notesOrm = await this.noteRepository.find({
      where: { eventId },
      relations: { author: true },
      order: { createdAt: 'DESC' },
    });
    return notesOrm.map(n => EventDomainOrmMapper.noteToDomain(n));
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await this.noteRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

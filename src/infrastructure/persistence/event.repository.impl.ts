import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  EventEntity,
  EventNoteEntity,
} from '../database/orm';
import { Event, EventNote } from '../../core/domain/entities/event.entity';
import {
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
  ) {}

  async create(entity: Event): Promise<Event> {
    const eventOrm = EventDomainOrmMapper.toOrm(entity);
    const saved = await this.eventRepository.save(eventOrm);
    return EventDomainOrmMapper.toDomain(saved);
  }

  async findById(id: string): Promise<Event | null> {
    const eventOrm = await this.eventRepository.findOne({
      where: { id },
      relations: ['organizer', 'candidate', 'notes'],
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

    if (filters?.userId) {
      queryBuilder.andWhere('event.candidateId = :userId', {
        userId: filters.userId,
      });
    }

    if (filters?.type) {
      queryBuilder.andWhere('event.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      queryBuilder.andWhere('event.status = :status', { status: filters.status });
    }

    if (filters?.from) {
      queryBuilder.andWhere('event.startAt >= :from', { from: filters.from });
    }

    if (filters?.to) {
      queryBuilder.andWhere('event.startAt <= :to', { to: filters.to });
    }

    const total = await queryBuilder.getCount();

    queryBuilder
      .skip(skip)
      .take(limit)
      .orderBy('event.startAt', 'ASC');

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
    if (entity.description !== undefined) updateData.description = entity.description;
    if (entity.type !== undefined) updateData.type = entity.type;
    if (entity.startAt !== undefined) updateData.startAt = entity.startAt;
    if (entity.endAt !== undefined) updateData.endAt = entity.endAt;
    if (entity.location !== undefined) updateData.location = entity.location;
    if (entity.meetingUrl !== undefined) updateData.meetingUrl = entity.meetingUrl;
    if (entity.status !== undefined) updateData.status = entity.status;

    if (Object.keys(updateData).length === 0) {
      return this.findById(id);
    }

    updateData.updatedAt = new Date();

    const result = await this.eventRepository.update(id, updateData);
    if (result.affected === 0) return null;

    return this.findById(id);
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
      relations: ['author'],
      order: { createdAt: 'DESC' },
    });
    return notesOrm.map(n => EventDomainOrmMapper.noteToDomain(n));
  }

  async deleteNote(id: string): Promise<boolean> {
    const result = await this.noteRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}
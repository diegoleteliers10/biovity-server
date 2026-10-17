import { EventRepositoryImpl } from './event.repository.impl';
import { Test, type TestingModule } from '@nestjs/testing';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  EventChangeHistoryEntity,
  EventEntity,
  EventNoteEntity,
} from '../database/orm';
import { Event } from '../../core/domain/entities/event.entity';
import { EventStatus, EventType } from '../../core/domain/enums';
import { EventDomainOrmMapper } from '../../shared/mappers/event/eventDomain-orm.mapper';

describe('EventRepositoryImpl', () => {
  it('filters application events to their matching organization', async () => {
    const conditions: Array<{
      clause: string;
      parameters?: Record<string, unknown>;
    }> = [];
    class QueryBuilderStub {
      leftJoinAndSelect(property: string, alias: string): this {
        void property;
        void alias;
        return this;
      }

      andWhere(clause: string, parameters?: Record<string, unknown>): this {
        conditions.push({ clause, parameters });
        return this;
      }

      getCount(): Promise<number> {
        return Promise.resolve(0);
      }

      skip(count: number): this {
        void count;
        return this;
      }

      take(count: number): this {
        void count;
        return this;
      }

      orderBy(property: string, order: string): this {
        void property;
        void order;
        return this;
      }

      getMany(): Promise<[]> {
        return Promise.resolve([]);
      }
    }
    const queryBuilder = new QueryBuilderStub();
    const eventRepository = {
      createQueryBuilder: () => queryBuilder,
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventRepositoryImpl,
        { provide: getRepositoryToken(EventEntity), useValue: eventRepository },
        { provide: getRepositoryToken(EventNoteEntity), useValue: {} },
        { provide: getRepositoryToken(EventChangeHistoryEntity), useValue: {} },
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn() } },
      ],
    }).compile();
    const repository = moduleRef.get(EventRepositoryImpl);

    await repository.findAll({
      applicationId: 'application-123',
    });

    expect(conditions[0]?.clause).toContain(
      'event.applicationId = :applicationId AND EXISTS',
    );
    expect(conditions[0]?.parameters).toEqual({
      applicationId: 'application-123',
    });
    expect(conditions[0]?.clause).toContain(
      'job."organizationId" = event.organizationId',
    );
    await moduleRef.close();
  });

  it('saves and returns the event UTC instant and IANA timezone', async () => {
    const startAt = new Date('2026-06-03T14:30:00.000Z');
    const timeZone = 'America/Santiago';
    const event = new Event(
      'event-123',
      'Interview',
      null,
      EventType.INTERVIEW,
      startAt,
      null,
      null,
      null,
      EventStatus.SCHEDULED,
      'organizer-123',
      null,
      'candidate-123',
      null,
      new Date('2026-06-01T10:00:00.000Z'),
      new Date('2026-06-01T10:00:00.000Z'),
      [],
      timeZone,
    );
    const eventRepository = {
      save: jest
        .fn()
        .mockImplementation((eventOrm: EventEntity) =>
          Promise.resolve({ ...eventOrm }),
        ),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventRepositoryImpl,
        { provide: getRepositoryToken(EventEntity), useValue: eventRepository },
        { provide: getRepositoryToken(EventNoteEntity), useValue: {} },
        { provide: getRepositoryToken(EventChangeHistoryEntity), useValue: {} },
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn() } },
      ],
    }).compile();
    const repository = moduleRef.get(EventRepositoryImpl);

    const savedEvent = await repository.create(event);

    expect(eventRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({ startAt, timeZone }),
    );
    expect(savedEvent.startAt.toISOString()).toBe('2026-06-03T14:30:00.000Z');
    expect(savedEvent.timeZone).toBe(timeZone);
    await moduleRef.close();
  });

  it('updates the UTC instant and IANA timezone together and returns reloaded values', async () => {
    const startAt = new Date('2026-06-03T16:45:00.000Z');
    const timeZone = 'Europe/Paris';
    const reloadedEvent = {
      id: 'event-123',
      title: 'Interview',
      description: null,
      type: EventType.INTERVIEW,
      startAt,
      timeZone,
      endAt: null,
      location: null,
      meetingUrl: null,
      status: EventStatus.SCHEDULED,
      organizerId: 'organizer-123',
      organizationId: null,
      candidateId: 'candidate-123',
      applicationId: null,
      createdAt: new Date('2026-06-01T10:00:00.000Z'),
      updatedAt: new Date('2026-06-03T16:45:00.000Z'),
      participants: [],
    };
    const eventRepository = {
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      findOne: jest.fn().mockResolvedValue(reloadedEvent),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventRepositoryImpl,
        { provide: getRepositoryToken(EventEntity), useValue: eventRepository },
        { provide: getRepositoryToken(EventNoteEntity), useValue: {} },
        { provide: getRepositoryToken(EventChangeHistoryEntity), useValue: {} },
        { provide: getDataSourceToken(), useValue: { transaction: jest.fn() } },
      ],
    }).compile();
    const repository = moduleRef.get(EventRepositoryImpl);

    const updatedEvent = await repository.update('event-123', {
      startAt,
      timeZone,
    });

    expect(eventRepository.update).toHaveBeenCalledWith(
      'event-123',
      expect.objectContaining({ startAt, timeZone }),
    );
    expect(eventRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'event-123' },
      relations: {
        organizer: true,
        candidate: true,
        notes: true,
        participants: true,
      },
    });
    expect(updatedEvent?.startAt.toISOString()).toBe(
      '2026-06-03T16:45:00.000Z',
    );
    expect(updatedEvent?.timeZone).toBe(timeZone);
    await moduleRef.close();
  });
});

describe('EventRepositoryImpl change history', () => {
  const eventId = 'event-123';
  const actorUserId = 'actor-123';
  let currentEvent: EventEntity;
  let eventOrm: {
    findOne: jest.Mock;
    save: jest.Mock;
  };
  let historyReadOrm: { find: jest.Mock };
  let historyWriteOrm: { save: jest.Mock };
  let managerQuery: jest.Mock;
  let transaction: jest.Mock;
  let repository: EventRepositoryImpl;
  let moduleRef: TestingModule;

  beforeEach(async () => {
    currentEvent = EventDomainOrmMapper.toOrm(
      new Event(
        eventId,
        'Interview',
        null,
        EventType.INTERVIEW,
        new Date('2026-11-01T10:00:00.000Z'),
        null,
        null,
        null,
        EventStatus.SCHEDULED,
        'organizer-123',
        null,
        'candidate-123',
        null,
      ),
    );
    eventOrm = {
      findOne: jest
        .fn()
        .mockImplementation(() => Promise.resolve(currentEvent)),
      save: jest.fn().mockImplementation((event: EventEntity) => {
        Object.assign(currentEvent, event);
        return Promise.resolve(currentEvent);
      }),
    };
    historyReadOrm = { find: jest.fn().mockResolvedValue([]) };
    historyWriteOrm = {
      save: jest.fn().mockResolvedValue({ id: 'history-123' }),
    };
    managerQuery = jest.fn().mockResolvedValue([]);
    const manager = {
      query: managerQuery,
      getRepository: (entity: unknown) =>
        entity === EventEntity ? eventOrm : historyWriteOrm,
    };
    transaction = jest.fn(
      async (operation: (manager: EntityManager) => Promise<unknown>) =>
        operation(manager as unknown as EntityManager),
    );
    moduleRef = await Test.createTestingModule({
      providers: [
        EventRepositoryImpl,
        { provide: getRepositoryToken(EventEntity), useValue: eventOrm },
        { provide: getRepositoryToken(EventNoteEntity), useValue: {} },
        {
          provide: getRepositoryToken(EventChangeHistoryEntity),
          useValue: historyReadOrm,
        },
        { provide: getDataSourceToken(), useValue: { transaction } },
      ],
    }).compile();
    repository = moduleRef.get(EventRepositoryImpl);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('writes event edits and audit fields in one locked transaction', async () => {
    const startAt = new Date('2026-11-02T11:30:00.000Z');

    const result = await repository.updateWithHistory(
      eventId,
      { title: 'Updated interview', startAt },
      actorUserId,
    );

    expect(eventOrm.findOne).toHaveBeenCalledWith({
      where: { id: eventId },
      lock: { mode: 'pessimistic_write' },
    });
    expect(eventOrm.save).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Updated interview', startAt }),
    );
    expect(historyWriteOrm.save).toHaveBeenCalledWith({
      eventId,
      actorUserId,
      action: 'updated',
      changes: {
        title: { from: 'Interview', to: 'Updated interview' },
        startAt: {
          from: '2026-11-01T10:00:00.000Z',
          to: '2026-11-02T11:30:00.000Z',
        },
      },
    });
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining('INSERT INTO event_change_notification_intent'),
      ['history-123', 'updated', 'Updated interview', eventId, 'organizer-123'],
    );
    expect(managerQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO interview_reminder_notification_intent',
      ),
      [eventId],
    );
    expect(result.kind).toBe('changed');
    expect(transaction).toHaveBeenCalledTimes(1);
  });

  it('does not add history for a no-op edit', async () => {
    const result = await repository.updateWithHistory(
      eventId,
      { title: 'Interview' },
      actorUserId,
    );

    expect(result.kind).toBe('unchanged');
    expect(eventOrm.save).not.toHaveBeenCalled();
    expect(historyWriteOrm.save).not.toHaveBeenCalled();
    expect(managerQuery).not.toHaveBeenCalled();
  });

  it('records cancellation once and leaves a repeat idempotent', async () => {
    const cancelled = await repository.cancelWithHistory(eventId, actorUserId);
    const repeated = await repository.cancelWithHistory(eventId, actorUserId);

    expect(cancelled.kind).toBe('changed');
    expect(historyWriteOrm.save).toHaveBeenCalledTimes(1);
    expect(managerQuery).toHaveBeenCalledTimes(2);
    expect(managerQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('UPDATE interview_reminder_notification_intent'),
      expect.any(Array),
    );
    expect(historyWriteOrm.save).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'cancelled',
        changes: { status: { from: 'scheduled', to: 'cancelled' } },
      }),
    );
    expect(repeated.kind).toBe('unchanged');
  });

  it('rejects edits to a cancelled event', async () => {
    currentEvent.status = EventStatus.CANCELLED;

    const result = await repository.updateWithHistory(
      eventId,
      { title: 'Changed after cancellation' },
      actorUserId,
    );

    expect(result.kind).toBe('closed');
    expect(eventOrm.save).not.toHaveBeenCalled();
    expect(historyWriteOrm.save).not.toHaveBeenCalled();
  });
});

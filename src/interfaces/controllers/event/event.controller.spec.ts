import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { getDataSourceToken, getRepositoryToken } from '@nestjs/typeorm';
import { EntityManager } from 'typeorm';
import {
  EventEntity,
  EventNoteEntity,
} from '../../../infrastructure/database/orm/event.entity';
import { EventChangeHistoryEntity } from '../../../infrastructure/database/orm';
import { EventRepositoryImpl } from '../../../infrastructure/persistence/event.repository.impl';
import { EVENT_PARTICIPANT_REPOSITORY } from '../../../core/repositories/event-participant.repository';
import { NotificationService } from '../../../shared/notification';
import { LOGGER_TOKEN } from '../../../shared/logger/logger.service';
import { EventCreateDto, EventUpdateDto } from '../../dtos/event/event.dto';
import { EventController } from './event.controller';
import { Test, type TestingModule } from '@nestjs/testing';
import { EventService } from '../../../core/services/event.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { EventType, ParticipantStatus } from '../../../core/domain/enums';

jest.mock('../../../core/services/google-calendar.service', () => ({
  GoogleCalendarService: class GoogleCalendarService {},
}));

describe('EventController', () => {
  it('forwards the application filter to the event service', async () => {
    const eventService = {
      getEvents: jest.fn().mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
      }),
    };
    const organizationAccess = {
      assertApplicationOrganizationAccess: jest
        .fn()
        .mockResolvedValue(undefined),
      assertApplicationAccess: jest.fn().mockResolvedValue(undefined),
      assertAccess: jest.fn().mockResolvedValue(undefined),
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: eventService },
        { provide: OrganizationAccessService, useValue: organizationAccess },
      ],
    }).compile();
    const controller = moduleRef.get(EventController);

    await controller.getEvents(
      {
        applicationId: 'application-id',
        organizationId: 'organization-id',
        page: 1,
        limit: 20,
      },
      {
        id: 'admin-id',
        email: 'admin@example.com',
        type: 'admin',
        organizationId: null,
      },
    );

    expect(eventService.getEvents).toHaveBeenCalledWith(
      expect.objectContaining({ applicationId: 'application-id' }),
      { page: 1, limit: 20 },
    );
    expect(
      organizationAccess.assertApplicationOrganizationAccess,
    ).toHaveBeenCalledWith(
      'application-id',
      'organization-id',
      expect.objectContaining({ id: 'admin-id' }),
      'read',
    );
    await moduleRef.close();
  });
});

describe('Event change history access', () => {
  it('requires event management access before reading the audit history', async () => {
    const id = '11111111-1111-4111-8111-111111111111';
    const requester: AuthenticatedUser = {
      id: '22222222-2222-4222-8222-222222222222',
      email: 'recruiter@example.com',
      type: 'organization',
      organizationId: null,
    };
    const entries = [];
    const eventService = {
      getEventChangeHistory: jest.fn().mockResolvedValue(entries),
    };
    const organizationAccess = { assertEventAccess: jest.fn() };
    const moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: eventService },
        { provide: OrganizationAccessService, useValue: organizationAccess },
      ],
    }).compile();
    const controller = moduleRef.get(EventController);

    await expect(
      controller.getEventChangeHistory(id, requester),
    ).resolves.toEqual({ eventId: id, entries });

    expect(organizationAccess.assertEventAccess).toHaveBeenCalledWith(
      id,
      requester,
      'manage',
    );
    expect(eventService.getEventChangeHistory).toHaveBeenCalledWith(id);
    await moduleRef.close();
  });
});

describe('Event API time zones', () => {
  it('saves and returns the instant and zone through create and edit', async () => {
    const rows = new Map<string, EventEntity>();
    const orm = {
      save: jest.fn((row: EventEntity) => {
        rows.set(row.id, row);
        return Promise.resolve(row);
      }),
      findOne: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(rows.get(where.id) ?? null),
      ),
      update: jest.fn((id: string, patch: Partial<EventEntity>) => {
        const row = rows.get(id);
        if (row) Object.assign(row, patch);
        return Promise.resolve({ affected: row ? 1 : 0 });
      }),
    };
    const runner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(async (_entity: unknown, row: EventEntity) =>
          orm.save(row),
        ),
        query: jest.fn().mockResolvedValue([]),
      },
    };
    const historyWriteRepo = {
      save: jest.fn().mockResolvedValue({ id: 'history-id' }),
    };
    const transaction = jest.fn(
      async (operation: (manager: EntityManager) => Promise<unknown>) =>
        operation({
          getRepository: (entity: unknown) =>
            entity === EventEntity ? orm : historyWriteRepo,
          query: jest.fn().mockResolvedValue([]),
          save: jest.fn().mockResolvedValue({ id: 'intent-id' }),
        } as unknown as EntityManager),
    );
    const moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        EventService,
        EventRepositoryImpl,
        { provide: 'IEventRepository', useExisting: EventRepositoryImpl },
        { provide: getRepositoryToken(EventEntity), useValue: orm },
        { provide: getRepositoryToken(EventNoteEntity), useValue: {} },
        { provide: getRepositoryToken(EventChangeHistoryEntity), useValue: {} },
        {
          provide: EVENT_PARTICIPANT_REPOSITORY,
          useValue: {
            seedParticipants: jest.fn(),
            findUserIdsByEventId: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: 'IUserRepository', useValue: {} },
        { provide: NotificationService, useValue: {} },
        {
          provide: getDataSourceToken(),
          useValue: { createQueryRunner: () => runner, transaction },
        },
        { provide: LOGGER_TOKEN, useValue: { error: jest.fn() } },
        {
          provide: OrganizationAccessService,
          useValue: {
            assertEventCreation: jest.fn(),
            assertEventAccess: jest.fn(),
          },
        },
      ],
    }).compile();
    const controller = moduleRef.get(EventController);
    const requester: AuthenticatedUser = {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'organizer@example.com',
      type: 'organization',
      organizationId: null,
    };
    const pipe = new ValidationPipe({ transform: true });
    const dto: EventCreateDto = {
      title: 'Interview',
      type: EventType.INTERVIEW,
      organizerId: '11111111-1111-4111-8111-111111111111',
      startAt: '2026-09-06T01:30:00-03:00',
      endAt: '2026-09-06T02:30:00-03:00',
      timeZone: 'America/Santiago',
    };
    const created = await controller.createEvent(dto, undefined);
    expect(created.startAt.toISOString()).toBe('2026-09-06T04:30:00.000Z');
    expect(created.endAt?.toISOString()).toBe('2026-09-06T05:30:00.000Z');
    expect(created).toMatchObject({ timeZone: 'America/Santiago' });
    const edited = await controller.updateEvent(
      created.id,
      {
        startAt: '2026-09-07T00:30:00Z',
        timeZone: 'Asia/Tokyo',
      },
      requester,
    );
    expect(edited.startAt.toISOString()).toBe('2026-09-07T00:30:00.000Z');
    expect(edited).toMatchObject({ timeZone: 'Asia/Tokyo' });
    const unchanged = await controller.updateEvent(
      created.id,
      { title: 'New title' },
      requester,
    );
    expect(unchanged.startAt.toISOString()).toBe('2026-09-07T00:30:00.000Z');
    expect(unchanged).toMatchObject({ timeZone: 'Asia/Tokyo' });
    const reloaded = await controller.getEventById(created.id, undefined);
    expect(reloaded).toMatchObject({ timeZone: 'Asia/Tokyo' });
    expect(reloaded.startAt.toISOString()).toBe('2026-09-07T00:30:00.000Z');
    const defaultedInput: EventCreateDto = {
      title: 'Default',
      type: EventType.INTERVIEW,
      organizerId: '11111111-1111-4111-8111-111111111111',
      startAt: '2026-04-05T04:30:00Z',
    };
    const defaulted = await controller.createEvent(defaultedInput, undefined);
    expect(defaulted).toMatchObject({ timeZone: 'America/Santiago' });
    expect(defaulted.startAt.toISOString()).toBe('2026-04-05T04:30:00.000Z');
    for (const metatype of [EventCreateDto, EventUpdateDto]) {
      await expect(
        pipe.transform(
          { ...dto, timeZone: 'Mars/Olympus' },
          { type: 'body', metatype },
        ),
      ).rejects.toMatchObject({ status: 400 });
      await expect(
        pipe.transform(
          { ...dto, startAt: '2026-09-06T00:30:00' },
          { type: 'body', metatype },
        ),
      ).rejects.toMatchObject({ status: 400 });
    }
    await moduleRef.close();
  });
});

describe('Event API IANA-zone validation', () => {
  it('rejects numeric fixed-offset zones on create and edit', async () => {
    const pipe = new ValidationPipe({ transform: true });
    for (const metatype of [EventCreateDto, EventUpdateDto]) {
      for (const timeZone of ['+03:00', '-04:00', '+0300']) {
        await expect(
          pipe.transform(
            {
              title: 'Interview',
              type: 'interview',
              organizerId: '11111111-1111-4111-8111-111111111111',
              startAt: '2026-10-10T15:30:00Z',
              timeZone,
            },
            { type: 'body', metatype },
          ),
        ).rejects.toMatchObject({ status: 400 });
      }
    }
  });
});

describe('Event RSVP controller authorization', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';
  const userId = '22222222-2222-4222-8222-222222222222';
  const requester: AuthenticatedUser = {
    id: userId,
    email: 'participant@example.com',
    type: 'professional',
    organizationId: null,
  };
  const eventService = { updateParticipantStatus: jest.fn() };
  const organizationAccess = { assertEventAccess: jest.fn() };
  let moduleRef: TestingModule;
  let controller: EventController;

  beforeEach(async () => {
    eventService.updateParticipantStatus.mockReset();
    organizationAccess.assertEventAccess.mockReset();
    moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: eventService },
        { provide: OrganizationAccessService, useValue: organizationAccess },
      ],
    }).compile();
    controller = moduleRef.get(EventController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('rejects a missing requester before event access or service execution', async () => {
    await expect(
      controller.updateParticipantStatus(
        eventId,
        userId,
        { status: ParticipantStatus.PENDING },
        undefined,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(organizationAccess.assertEventAccess).not.toHaveBeenCalled();
    expect(eventService.updateParticipantStatus).not.toHaveBeenCalled();
  });

  it('rejects a different participant identity before event access or service execution', async () => {
    await expect(
      controller.updateParticipantStatus(
        eventId,
        '33333333-3333-4333-8333-333333333333',
        { status: ParticipantStatus.PENDING },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(organizationAccess.assertEventAccess).not.toHaveBeenCalled();
    expect(eventService.updateParticipantStatus).not.toHaveBeenCalled();
  });

  it('checks event RSVP access for matching identity and blocks a denied request', async () => {
    organizationAccess.assertEventAccess.mockRejectedValue(
      new ForbiddenException(),
    );

    await expect(
      controller.updateParticipantStatus(
        eventId,
        userId,
        { status: ParticipantStatus.PENDING },
        requester,
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(organizationAccess.assertEventAccess).toHaveBeenCalledWith(
      eventId,
      requester,
      'rsvp',
    );
    expect(eventService.updateParticipantStatus).not.toHaveBeenCalled();
  });
});

describe('Event RSVP history access', () => {
  const eventId = '11111111-1111-4111-8111-111111111111';
  const candidateId = '22222222-2222-4222-8222-222222222222';
  const recruiterId = '33333333-3333-4333-8333-333333333333';
  const organizationId = '44444444-4444-4444-8444-444444444444';
  const entries = [
    {
      id: '55555555-5555-4555-8555-555555555555',
      fromStatus: ParticipantStatus.PENDING,
      toStatus: ParticipantStatus.ACCEPTED,
      changedAt: new Date('2026-10-10T10:00:00Z'),
    },
  ];
  const eventService = { getParticipantStatusHistory: jest.fn() };
  const organizationAccess = {
    assertEventAccess: jest.fn(),
    assertAccess: jest.fn(),
  };
  let moduleRef: TestingModule;
  let controller: EventController;

  beforeEach(async () => {
    jest.clearAllMocks();
    organizationAccess.assertEventAccess.mockResolvedValue({
      organizerId: recruiterId,
      candidateId,
      organizationId,
    });
    eventService.getParticipantStatusHistory.mockResolvedValue(entries);
    moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: eventService },
        { provide: OrganizationAccessService, useValue: organizationAccess },
      ],
    }).compile();
    controller = moduleRef.get(EventController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('allows the candidate to read their own history', async () => {
    const response = await controller.getParticipantStatusHistory(
      eventId,
      candidateId,
      {
        id: candidateId,
        email: 'candidate@example.com',
        type: 'professional',
        organizationId: null,
      },
    );

    expect(response).toEqual({ eventId, userId: candidateId, entries });
    expect(organizationAccess.assertAccess).not.toHaveBeenCalled();
  });

  it('returns an empty timeline when a participant has no status changes', async () => {
    eventService.getParticipantStatusHistory.mockResolvedValueOnce([]);
    const response = await controller.getParticipantStatusHistory(
      eventId,
      candidateId,
      {
        id: candidateId,
        email: 'candidate@example.com',
        type: 'professional',
        organizationId: null,
      },
    );

    expect(response.entries).toEqual([]);
  });

  it('requires organization read access for a recruiter who is not the organizer', async () => {
    await controller.getParticipantStatusHistory(eventId, candidateId, {
      id: '66666666-6666-4666-8666-666666666666',
      email: 'teammate@example.com',
      type: 'organization',
      organizationId,
    });

    expect(organizationAccess.assertAccess).toHaveBeenCalledWith(
      organizationId,
      expect.objectContaining({ type: 'organization' }),
      'read',
    );
    expect(eventService.getParticipantStatusHistory).toHaveBeenCalledWith(
      eventId,
      candidateId,
    );
  });

  it('blocks an unrelated participant before reading another user history', async () => {
    const peerId = '77777777-7777-4777-8777-777777777777';
    organizationAccess.assertAccess.mockRejectedValueOnce(
      new ForbiddenException(),
    );
    await expect(
      controller.getParticipantStatusHistory(eventId, candidateId, {
        id: peerId,
        email: 'peer@example.com',
        type: 'professional',
        organizationId: null,
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(eventService.getParticipantStatusHistory).not.toHaveBeenCalled();
  });
});

describe('Event create/edit controller authorization', () => {
  const requester: AuthenticatedUser = {
    id: '22222222-2222-4222-8222-222222222222',
    email: 'organizer@example.com',
    type: 'organization',
    organizationId: '33333333-3333-4333-8333-333333333333',
  };
  const eventService = { createEvent: jest.fn(), updateEvent: jest.fn() };
  const organizationAccess = {
    assertEventCreation: jest.fn(),
    assertEventAccess: jest.fn(),
  };
  let moduleRef: TestingModule;
  let controller: EventController;

  beforeEach(async () => {
    jest.clearAllMocks();
    moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        { provide: EventService, useValue: eventService },
        { provide: OrganizationAccessService, useValue: organizationAccess },
      ],
    }).compile();
    controller = moduleRef.get(EventController);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it('blocks denied creation before service execution', async () => {
    organizationAccess.assertEventCreation.mockRejectedValue(
      new ForbiddenException(),
    );
    const dto: EventCreateDto = {
      title: 'Interview',
      type: EventType.INTERVIEW,
      organizerId: requester.id,
      startAt: '2026-10-10T15:00:00Z',
      timeZone: 'America/Santiago',
    };

    await expect(controller.createEvent(dto, requester)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(organizationAccess.assertEventCreation).toHaveBeenCalledWith(
      requester,
      dto,
    );
    expect(eventService.createEvent).not.toHaveBeenCalled();
  });

  it('blocks denied manage access before edit service execution', async () => {
    organizationAccess.assertEventAccess.mockRejectedValue(
      new ForbiddenException(),
    );
    const eventId = '11111111-1111-4111-8111-111111111111';

    await expect(
      controller.updateEvent(eventId, { timeZone: 'Asia/Tokyo' }, requester),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(organizationAccess.assertEventAccess).toHaveBeenCalledWith(
      eventId,
      requester,
      'manage',
    );
    expect(eventService.updateEvent).not.toHaveBeenCalled();
  });
});

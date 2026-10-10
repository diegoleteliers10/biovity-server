import { ForbiddenException, ValidationPipe } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import {
  EventEntity,
  EventNoteEntity,
} from '../../../infrastructure/database/orm/event.entity';
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

describe('Event API time zones', () => {
  it('saves and returns the instant and zone through create and edit', async () => {
    const rows = new Map<string, EventEntity>();
    const orm = {
      save: jest.fn(async (row: EventEntity) => {
        rows.set(row.id, row);
        return row;
      }),
      findOne: jest.fn(
        async ({ where }: { where: { id: string } }) =>
          rows.get(where.id) ?? null,
      ),
      update: jest.fn(async (id: string, patch: Partial<EventEntity>) => {
        const row = rows.get(id);
        if (row) Object.assign(row, patch);
        return { affected: row ? 1 : 0 };
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
      },
    };
    const moduleRef = await Test.createTestingModule({
      controllers: [EventController],
      providers: [
        EventService,
        EventRepositoryImpl,
        { provide: 'IEventRepository', useExisting: EventRepositoryImpl },
        { provide: getRepositoryToken(EventEntity), useValue: orm },
        { provide: getRepositoryToken(EventNoteEntity), useValue: {} },
        {
          provide: EVENT_PARTICIPANT_REPOSITORY,
          useValue: {
            seedParticipants: jest.fn(),
            findUserIdsByEventId: jest.fn().mockResolvedValue([]),
          },
        },
        { provide: 'IUserRepository', useValue: {} },
        { provide: NotificationService, useValue: {} },
        { provide: DataSource, useValue: { createQueryRunner: () => runner } },
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
    const pipe = new ValidationPipe({ transform: true });
    const dto = await pipe.transform(
      {
        title: 'Interview',
        type: 'interview',
        organizerId: '11111111-1111-4111-8111-111111111111',
        startAt: '2026-09-06T01:30:00-03:00',
        endAt: '2026-09-06T02:30:00-03:00',
        timeZone: 'America/Santiago',
      },
      { type: 'body', metatype: EventCreateDto },
    );
    const created = await controller.createEvent(dto, undefined);
    expect(created.startAt.toISOString()).toBe('2026-09-06T04:30:00.000Z');
    expect(created.endAt?.toISOString()).toBe('2026-09-06T05:30:00.000Z');
    expect(created).toMatchObject({ timeZone: 'America/Santiago' });
    const edited = await controller.updateEvent(
      created.id,
      await pipe.transform(
        {
          startAt: '2026-09-07T00:30:00Z',
          timeZone: 'Asia/Tokyo',
        },
        { type: 'body', metatype: EventUpdateDto },
      ),
      undefined,
    );
    expect(edited.startAt.toISOString()).toBe('2026-09-07T00:30:00.000Z');
    expect(edited).toMatchObject({ timeZone: 'Asia/Tokyo' });
    const unchanged = await controller.updateEvent(
      created.id,
      { title: 'New title' },
      undefined,
    );
    expect(unchanged.startAt.toISOString()).toBe('2026-09-07T00:30:00.000Z');
    expect(unchanged).toMatchObject({ timeZone: 'Asia/Tokyo' });
    const reloaded = await controller.getEventById(created.id, undefined);
    expect(reloaded).toMatchObject({ timeZone: 'Asia/Tokyo' });
    expect(reloaded.startAt.toISOString()).toBe('2026-09-07T00:30:00.000Z');
    const defaulted = await controller.createEvent(
      await pipe.transform(
        {
          title: 'Default',
          type: 'interview',
          organizerId: '11111111-1111-4111-8111-111111111111',
          startAt: '2026-04-05T04:30:00Z',
        },
        { type: 'body', metatype: EventCreateDto },
      ),
      undefined,
    );
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

import { Test, type TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { Event } from '../domain/entities/event.entity';
import { EventStatus, EventType } from '../domain/enums';
import { EVENT_PARTICIPANT_REPOSITORY } from '../repositories/event-participant.repository';
import type { CreateEventInput } from '../use-cases/event/event.use-case';
import { LOGGER_TOKEN } from '../../shared/logger/logger.service';
import { NotificationService } from '../../shared/notification';
import { EventService } from './event.service';

describe('EventService create/edit failures', () => {
  const savedEvent = new Event(
    '11111111-1111-4111-8111-111111111111',
    'Interview',
    null,
    EventType.INTERVIEW,
    new Date('2026-10-10T15:00:00Z'),
    null,
    null,
    null,
    EventStatus.SCHEDULED,
    '22222222-2222-4222-8222-222222222222',
    '33333333-3333-4333-8333-333333333333',
    '44444444-4444-4444-8444-444444444444',
    null,
  );
  const input: CreateEventInput = {
    title: savedEvent.title,
    type: EventType.INTERVIEW,
    startAt: new Date('2026-10-10T15:00:00Z'),
    organizerId: savedEvent.organizerId,
    candidateId: '44444444-4444-4444-8444-444444444444',
    timeZone: 'America/Santiago',
  };
  const eventRepository = { findById: jest.fn(), update: jest.fn() };
  const participants = {
    seedParticipants: jest.fn(),
    findUserIdsByEventId: jest.fn(),
  };
  const users = { findById: jest.fn() };
  const notifications = { create: jest.fn(), createMany: jest.fn() };
  const logger = { error: jest.fn() };
  const runner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: { save: jest.fn() },
  };
  let moduleRef: TestingModule;
  let service: EventService;

  beforeEach(async () => {
    jest.resetAllMocks();
    runner.manager.save.mockResolvedValue({
      id: savedEvent.id,
      organizerId: savedEvent.organizerId,
      candidateId: savedEvent.candidateId,
    });
    eventRepository.findById.mockResolvedValue(savedEvent);
    eventRepository.update.mockResolvedValue(savedEvent);
    users.findById.mockResolvedValue({ name: 'Recruiter' });
    participants.findUserIdsByEventId.mockResolvedValue([input.candidateId]);
    moduleRef = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: 'IEventRepository', useValue: eventRepository },
        { provide: EVENT_PARTICIPANT_REPOSITORY, useValue: participants },
        { provide: 'IUserRepository', useValue: users },
        { provide: NotificationService, useValue: notifications },
        { provide: DataSource, useValue: { createQueryRunner: () => runner } },
        { provide: LOGGER_TOKEN, useValue: logger },
      ],
    }).compile();
    service = moduleRef.get(EventService);
  });

  afterEach(async () => {
    await moduleRef.close();
  });

  it.each(['event save', 'participant seed'])(
    'rejects a failed %s before commit or notifications',
    async operation => {
      const failure = new Error(`${operation} failed`);
      if (operation === 'event save')
        runner.manager.save.mockRejectedValue(failure);
      else participants.seedParticipants.mockRejectedValue(failure);

      await expect(service.createEvent(input)).rejects.toBe(failure);
      expect(runner.commitTransaction).not.toHaveBeenCalled();
      expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
      expect(runner.release).toHaveBeenCalledTimes(1);
      expect(eventRepository.findById).not.toHaveBeenCalled();
      expect(notifications.create).not.toHaveBeenCalled();
      expect(notifications.createMany).not.toHaveBeenCalled();
      if (operation === 'event save')
        expect(participants.seedParticipants).not.toHaveBeenCalled();
    },
  );

  it('rejects edit persistence failure before notification work', async () => {
    const failure = new Error('Event edit failed');
    eventRepository.update.mockRejectedValue(failure);

    await expect(
      service.updateEvent(savedEvent.id, { timeZone: 'Asia/Tokyo' }),
    ).rejects.toBe(failure);
    expect(participants.findUserIdsByEventId).not.toHaveBeenCalled();
    expect(notifications.create).not.toHaveBeenCalled();
    expect(notifications.createMany).not.toHaveBeenCalled();
  });

  it('returns the committed event and logs a create notification failure', async () => {
    const failure = new Error('Create notification failed');
    notifications.create.mockRejectedValue(failure);

    await expect(service.createEvent(input)).resolves.toBe(savedEvent);
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
    expect(runner.rollbackTransaction).not.toHaveBeenCalled();
    expect(runner.release).toHaveBeenCalledTimes(1);
    expect(notifications.create).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'event notification failed (interview-created): Create notification failed',
      failure.stack,
      'EventService',
    );
  });

  it('returns the saved edit and logs an update notification failure', async () => {
    const failure = new Error('Edit notification failed');
    notifications.createMany.mockRejectedValue(failure);

    await expect(
      service.updateEvent(savedEvent.id, { title: 'Updated interview' }),
    ).resolves.toBe(savedEvent);
    expect(eventRepository.update).toHaveBeenCalledWith(savedEvent.id, {
      title: 'Updated interview',
    });
    expect(notifications.createMany).toHaveBeenCalledTimes(1);
    expect(logger.error).toHaveBeenCalledWith(
      'event notification failed (event-updated): Edit notification failed',
      failure.stack,
      'EventService',
    );
  });
});

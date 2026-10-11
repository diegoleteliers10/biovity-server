import { EventRepositoryImpl } from './event.repository.impl';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventEntity, EventNoteEntity } from '../database/orm';
import { Event } from '../../core/domain/entities/event.entity';
import { EventStatus, EventType } from '../../core/domain/enums';

describe('EventRepositoryImpl', () => {
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
      save: jest.fn().mockImplementation(async eventOrm => ({ ...eventOrm })),
    };
    const moduleRef = await Test.createTestingModule({
      providers: [
        EventRepositoryImpl,
        { provide: getRepositoryToken(EventEntity), useValue: eventRepository },
        { provide: getRepositoryToken(EventNoteEntity), useValue: {} },
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

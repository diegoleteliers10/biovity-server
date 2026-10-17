import { Test, type TestingModule } from '@nestjs/testing';
import { ConflictException } from '@nestjs/common';
import { getDataSourceToken } from '@nestjs/typeorm';
import { Event } from '../domain/entities/event.entity';
import { EventStatus, EventType, ParticipantStatus } from '../domain/enums';
import { EVENT_PARTICIPANT_REPOSITORY } from '../repositories/event-participant.repository';
import type { CreateEventInput } from '../use-cases/event/event.use-case';
import { EventEntity } from '../../infrastructure/database/orm/event.entity';
import { EventService } from './event.service';

jest.mock('./google-calendar.service', () => ({
  GoogleCalendarService: class GoogleCalendarService {},
}));

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
  const eventRepository = {
    findById: jest.fn(),
    updateWithHistory: jest.fn(),
    cancelWithHistory: jest.fn(),
    findChangeHistory: jest.fn(),
    update: jest.fn(),
  };
  const participants = {
    seedParticipants: jest.fn(),
    findUserIdsByEventId: jest.fn(),
    findByEventAndUser: jest.fn(),
    findStatusHistory: jest.fn(),
    updateStatus: jest.fn(),
  };
  const runner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    query: jest.fn(),
    manager: { save: jest.fn(), query: jest.fn() },
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
    eventRepository.updateWithHistory.mockResolvedValue({
      kind: 'changed',
      event: savedEvent,
      action: 'updated',
    });
    eventRepository.cancelWithHistory.mockResolvedValue({
      kind: 'changed',
      event: savedEvent,
      action: 'cancelled',
    });
    moduleRef = await Test.createTestingModule({
      providers: [
        EventService,
        { provide: 'IEventRepository', useValue: eventRepository },
        { provide: EVENT_PARTICIPANT_REPOSITORY, useValue: participants },
        {
          provide: getDataSourceToken(),
          useValue: { createQueryRunner: () => runner },
        },
      ],
    }).compile();
    service = moduleRef.get(EventService);
  });

  afterEach(async () => {
    await moduleRef?.close();
  });

  it.each(['event save', 'participant seed'])(
    'rejects a failed %s before commit',
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
      if (operation === 'event save')
        expect(participants.seedParticipants).not.toHaveBeenCalled();
    },
  );

  it('rejects edit persistence failure before notification work', async () => {
    const failure = new Error('Event edit failed');
    eventRepository.updateWithHistory.mockRejectedValue(failure);

    await expect(
      service.updateEvent(
        savedEvent.id,
        { timeZone: 'Asia/Tokyo' },
        savedEvent.organizerId,
      ),
    ).rejects.toBe(failure);
  });

  it('stores durable creation and reminder intents in the event transaction', async () => {
    await expect(service.createEvent(input)).resolves.toBe(savedEvent);

    expect(runner.manager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO event_lifecycle_notification_intent',
      ),
      [savedEvent.id],
    );
    expect(runner.manager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO interview_reminder_notification_intent',
      ),
      [savedEvent.id],
    );
    expect(runner.commitTransaction).toHaveBeenCalledTimes(1);
  });

  it('rolls back the event when it cannot enqueue its creation notice', async () => {
    const failure = new Error('Intent insert failed');
    runner.manager.query.mockRejectedValueOnce(failure);

    await expect(service.createEvent(input)).rejects.toBe(failure);

    expect(runner.commitTransaction).not.toHaveBeenCalled();
    expect(runner.rollbackTransaction).toHaveBeenCalledTimes(1);
    expect(runner.release).toHaveBeenCalledTimes(1);
  });

  it('stores interviewers as pending participants before creating notice intents', async () => {
    const interviewerIds = ['55555555-5555-4555-8555-555555555555'];
    const invited = { ...input, interviewerIds };

    await expect(service.createEvent(invited)).resolves.toBe(savedEvent);

    expect(participants.seedParticipants).toHaveBeenCalledWith(
      runner.manager,
      savedEvent.id,
      savedEvent.organizerId,
      savedEvent.candidateId,
      [],
      true,
      [
        {
          userId: interviewerIds[0],
          roleId: '00000000-0000-4000-8000-000000000001',
          roleLabel: 'General',
        },
      ],
    );
    expect(runner.manager.query).toHaveBeenCalledWith(
      expect.stringContaining(
        'INSERT INTO event_lifecycle_notification_intent',
      ),
      [savedEvent.id],
    );
  });

  it('captures the application stage and current rubric version when scheduling', async () => {
    runner.query.mockResolvedValueOnce([
      {
        pipeline_stage_id: '66666666-6666-4666-8666-666666666666',
        pipeline_stage_name_snapshot: 'Entrevista técnica',
        rubric_version_id: '77777777-7777-4777-8777-777777777777',
      },
    ]);

    await service.createEvent({
      ...input,
      applicationId: '55555555-5555-4555-8555-555555555555',
    });

    expect(runner.query).toHaveBeenCalledWith(
      expect.stringContaining('FOR SHARE OF candidate_application, stage'),
      ['55555555-5555-4555-8555-555555555555'],
    );
    expect(runner.manager.save).toHaveBeenCalledWith(
      EventEntity,
      expect.objectContaining({
        pipelineStageId: '66666666-6666-4666-8666-666666666666',
        pipelineStageNameSnapshot: 'Entrevista técnica',
        rubricVersionId: '77777777-7777-4777-8777-777777777777',
      }),
    );
  });

  it('returns the saved edit without sending a post-commit notification', async () => {
    await expect(
      service.updateEvent(
        savedEvent.id,
        { title: 'Updated interview' },
        savedEvent.organizerId,
      ),
    ).resolves.toBe(savedEvent);
    expect(eventRepository.updateWithHistory).toHaveBeenCalledWith(
      savedEvent.id,
      { title: 'Updated interview' },
      savedEvent.organizerId,
    );
  });

  it('saves cancellation without a post-commit notification', async () => {
    await expect(
      service.updateEvent(
        savedEvent.id,
        { status: EventStatus.CANCELLED },
        savedEvent.organizerId,
      ),
    ).resolves.toBe(savedEvent);
    expect(eventRepository.updateWithHistory).toHaveBeenCalledWith(
      savedEvent.id,
      { status: EventStatus.CANCELLED },
      savedEvent.organizerId,
    );
  });

  it('routes delete through the audited cancellation operation', async () => {
    await expect(
      service.deleteEvent(savedEvent.id, savedEvent.organizerId),
    ).resolves.toBe(true);
    expect(eventRepository.cancelWithHistory).toHaveBeenCalledWith(
      savedEvent.id,
      savedEvent.organizerId,
    );
  });

  it('records a changed RSVP after the repository persists its durable intent', async () => {
    const candidateId = '44444444-4444-4444-8444-444444444444';
    participants.updateStatus.mockResolvedValue({
      kind: 'changed',
      fromStatus: ParticipantStatus.PENDING,
      toStatus: ParticipantStatus.ACCEPTED,
      changedAt: new Date('2026-10-10T00:00:00.000Z'),
    });

    await expect(
      service.updateParticipantStatus(
        savedEvent.id,
        candidateId,
        ParticipantStatus.ACCEPTED,
      ),
    ).resolves.toBe(savedEvent);

    expect(participants.updateStatus).toHaveBeenCalledWith(
      savedEvent.id,
      candidateId,
      ParticipantStatus.ACCEPTED,
      candidateId,
    );
  });

  it('does not add a durable notice for an idempotent RSVP update', async () => {
    const candidateId = '44444444-4444-4444-8444-444444444444';
    participants.updateStatus.mockResolvedValue({
      kind: 'unchanged',
      status: ParticipantStatus.PENDING,
    });

    await expect(
      service.updateParticipantStatus(
        savedEvent.id,
        candidateId,
        ParticipantStatus.PENDING,
      ),
    ).resolves.toBe(savedEvent);
  });

  it('returns a conflict when an RSVP change is outside the response window', async () => {
    participants.updateStatus.mockResolvedValue({ kind: 'closed' });

    await expect(
      service.updateParticipantStatus(
        savedEvent.id,
        '44444444-4444-4444-8444-444444444444',
        ParticipantStatus.ACCEPTED,
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('returns RSVP history only for an existing event participant', async () => {
    const history = [
      {
        id: 'history-1',
        fromStatus: ParticipantStatus.PENDING,
        toStatus: ParticipantStatus.ACCEPTED,
        changedAt: new Date('2026-10-10T10:00:00Z'),
      },
    ];
    participants.findByEventAndUser.mockResolvedValue({ id: 'participant-1' });
    participants.findStatusHistory.mockResolvedValue(history);

    await expect(
      service.getParticipantStatusHistory(savedEvent.id, input.candidateId!),
    ).resolves.toEqual(history);
    expect(participants.findStatusHistory).toHaveBeenCalledWith(
      savedEvent.id,
      input.candidateId,
    );

    participants.findByEventAndUser.mockResolvedValue(null);
    await expect(
      service.getParticipantStatusHistory(savedEvent.id, 'not-a-participant'),
    ).resolves.toBeNull();
    expect(participants.findStatusHistory).toHaveBeenCalledTimes(1);
  });
});

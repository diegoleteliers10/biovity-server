import { DataSource, EntityManager } from 'typeorm';
import { NotificationType } from '../../core/domain/enums';
import { EventLifecycleNotificationDispatcherService } from './event-lifecycle-notification-dispatcher.service';

const intent: {
  id: string;
  kind: 'created' | 'rsvp';
  eventId: string;
  participantId: string;
  recipientId: string;
  eventTitle: string;
  eventType: string;
  eventStartAt: Date;
  eventTimeZone: string;
  actorUserId: string;
  actorName: string;
  fromStatus: string | null;
  toStatus: string | null;
  dedupKey: string;
} = {
  id: 'intent-1',
  kind: 'created',
  eventId: 'event-1',
  participantId: 'participant-1',
  recipientId: 'candidate-1',
  eventTitle: 'Interview',
  eventType: 'interview',
  eventStartAt: new Date('2026-10-20T15:00:00.000Z'),
  eventTimeZone: 'America/Santiago',
  actorUserId: 'organizer-1',
  actorName: 'Recruiter',
  fromStatus: null,
  toStatus: null,
  dedupKey: 'event:event-1:created:candidate-1',
};

const createService = (
  managerQuery: jest.Mock,
  dispatchIntent: typeof intent = intent,
) => {
  const logger = { error: jest.fn() };
  const manager = { query: managerQuery };
  const dataSource = {
    query: jest
      .fn()
      .mockResolvedValue(undefined)
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([dispatchIntent]),
    transaction: jest.fn(operation =>
      Promise.resolve().then(() => operation(manager)),
    ),
  };
  return {
    service: new EventLifecycleNotificationDispatcherService(
      dataSource as unknown as DataSource,
      logger as never,
    ),
    dataSource,
    logger,
  };
};

describe('EventLifecycleNotificationDispatcherService', () => {
  it('delivers a scheduled event notice once and accepts the intent atomically', async () => {
    const managerQuery = jest
      .fn()
      .mockResolvedValueOnce([
        { status: 'scheduled', startAt: new Date(Date.now() + 60_000) },
      ])
      .mockResolvedValueOnce([{ status: 'pending' }])
      .mockResolvedValueOnce([{ isActive: true, notification_preferences: {} }])
      .mockResolvedValueOnce([{ id: 'intent-1' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const { service, dataSource } = createService(managerQuery);

    await service.dispatch();

    expect(managerQuery.mock.calls[4]?.[1]).toEqual([
      'candidate-1',
      NotificationType.INTERVIEW,
      'Nueva entrevista',
      expect.stringContaining('Recruiter agendó'),
      '/dashboard/calendar',
      expect.stringContaining('"eventId":"event-1"'),
      intent.dedupKey,
    ]);
    expect(managerQuery.mock.calls[5]?.[1]).toEqual(['intent-1', 'accepted']);
    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
  });

  it('suppresses delivery when the recipient disabled interview notices', async () => {
    const managerQuery = jest
      .fn()
      .mockResolvedValueOnce([
        { status: 'scheduled', startAt: new Date(Date.now() + 60_000) },
      ])
      .mockResolvedValueOnce([{ status: 'pending' }])
      .mockResolvedValueOnce([
        {
          isActive: true,
          notification_preferences: { events: { interview: false } },
        },
      ])
      .mockResolvedValueOnce(undefined);
    const { service } = createService(managerQuery);

    await service.dispatch();

    expect(managerQuery).toHaveBeenCalledTimes(4);
    expect(managerQuery.mock.calls[3]?.[1]).toEqual(['intent-1', 'suppressed']);
  });

  it('delivers an RSVP notice to the organizer and checks the acting participant', async () => {
    const rsvpIntent = {
      ...intent,
      kind: 'rsvp' as const,
      recipientId: 'organizer-1',
      actorUserId: 'candidate-1',
      fromStatus: 'pending',
      toStatus: 'accepted',
      dedupKey: 'event:event-1:rsvp:history-1',
    };
    const managerQuery = jest
      .fn()
      .mockResolvedValueOnce([
        { status: 'scheduled', startAt: new Date(Date.now() + 60_000) },
      ])
      .mockResolvedValueOnce([{ status: 'accepted' }])
      .mockResolvedValueOnce([{ isActive: true, notification_preferences: {} }])
      .mockResolvedValueOnce([{ id: 'intent-1' }])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce(undefined);
    const { service } = createService(managerQuery, rsvpIntent);

    await service.dispatch();

    expect(managerQuery.mock.calls[1]?.[1]).toEqual([
      'participant-1',
      'event-1',
      'candidate-1',
    ]);
    expect(managerQuery.mock.calls[4]?.[1]).toEqual([
      'organizer-1',
      NotificationType.INTERVIEW,
      'Respuesta de invitación',
      "Recruiter aceptó 'Interview'",
      '/dashboard/calendar',
      expect.stringContaining('"userId":"candidate-1"'),
      rsvpIntent.dedupKey,
    ]);
  });

  it('suppresses an RSVP notice after the event is cancelled', async () => {
    const rsvpIntent = {
      ...intent,
      kind: 'rsvp' as const,
      recipientId: 'organizer-1',
      actorUserId: 'candidate-1',
      fromStatus: 'pending',
      toStatus: 'accepted',
    };
    const managerQuery = jest
      .fn()
      .mockResolvedValueOnce([
        { status: 'cancelled', startAt: new Date(Date.now() + 60_000) },
      ])
      .mockResolvedValueOnce([{ status: 'accepted' }])
      .mockResolvedValueOnce([{ isActive: true, notification_preferences: {} }])
      .mockResolvedValueOnce(undefined);
    const { service } = createService(managerQuery, rsvpIntent);

    await service.dispatch();

    expect(managerQuery).toHaveBeenCalledTimes(4);
    expect(managerQuery.mock.calls[3]?.[1]).toEqual(['intent-1', 'suppressed']);
  });

  it('retries delivery when the database transaction fails', async () => {
    const managerQuery = jest
      .fn()
      .mockResolvedValueOnce([{ status: 'scheduled' }])
      .mockRejectedValueOnce(new Error('participant read failed'));
    const { service, dataSource, logger } = createService(managerQuery);

    await service.dispatch();

    expect(dataSource.query).toHaveBeenCalledTimes(3);
    expect(dataSource.query.mock.calls[2]?.[0]).toContain(
      "SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END",
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Event lifecycle notification delivery failed for intent-1',
    );
  });
});

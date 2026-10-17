import { DataSource } from 'typeorm';
import {
  EventStatus,
  EventType,
  NotificationType,
} from '../../core/domain/enums';
import { InterviewReminderNotificationDispatcherService } from './interview-reminder-notification-dispatcher.service';

const futureStartAt = new Date(Date.now() + 60 * 60 * 1000);

const createDispatcher = (
  participantStatus: string,
  shouldFailDelivery = false,
) => {
  const writes: Array<{ sql: string; params?: unknown[] }> = [];
  const managerQuery = jest.fn((sql: string, params?: unknown[]) => {
    writes.push({ sql, params });
    if (sql.includes('FROM event WHERE')) {
      return Promise.resolve([
        {
          id: 'event-1',
          title: 'Entrevista técnica',
          startAt: futureStartAt,
          timeZone: 'America/Santiago',
          status: EventStatus.SCHEDULED,
          type: EventType.INTERVIEW,
        },
      ]);
    }
    if (sql.includes('SELECT status FROM interview_reminder')) {
      return Promise.resolve([{ status: 'processing' }]);
    }
    if (sql.includes('FROM event_participant participant')) {
      if (shouldFailDelivery) {
        return Promise.reject(new Error('database unavailable'));
      }
      return Promise.resolve([
        {
          status: participantStatus,
          isActive: true,
          notification_preferences: null,
        },
      ]);
    }
    if (sql.includes('TO_CHAR')) {
      return Promise.resolve([{ startAtLocal: '2026-10-12 10:30' }]);
    }
    return Promise.resolve([]);
  });
  const claimQuery = jest
    .fn()
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([
      {
        id: 'intent-1',
        eventId: 'event-1',
        participantId: 'participant-1',
        recipientId: 'candidate-1',
        scheduledStartAt: futureStartAt,
      },
    ]);
  if (shouldFailDelivery) claimQuery.mockResolvedValueOnce([]);
  const dataSource = {
    query: claimQuery,
    transaction: jest.fn(
      (
        operation: (manager: {
          query: typeof managerQuery;
        }) => Promise<unknown>,
      ) => operation({ query: managerQuery }),
    ),
  } as unknown as DataSource;
  const logger = { error: jest.fn() };

  return {
    dispatcher: new InterviewReminderNotificationDispatcherService(
      dataSource,
      logger as never,
    ),
    writes,
    managerQuery,
    claimQuery,
    logger,
  };
};

describe('InterviewReminderNotificationDispatcherService', () => {
  it('creates the in-app reminder and accepts the intent in one transaction', async () => {
    const { dispatcher, writes } = createDispatcher('accepted');

    await dispatcher.dispatch();

    const insert = writes.find(({ sql }) =>
      sql.includes('INSERT INTO notification_deduplication'),
    );
    expect(insert?.params?.[0]).toBe('candidate-1');
    expect(insert?.params?.[1]).toBe(NotificationType.INTERVIEW);
    expect(insert?.params?.[3]).toBe(
      'Entrevista técnica · 2026-10-12 10:30 (America/Santiago)',
    );
    expect(insert?.params?.[6]).toBe('interview-reminder:intent-1');
    expect(
      writes.some(
        ({ sql, params }) =>
          sql.includes('SET status = $2') && params?.[1] === 'accepted',
      ),
    ).toBe(true);
  });

  it('suppresses the intent after the attendee declines', async () => {
    const { dispatcher, writes } = createDispatcher('declined');

    await dispatcher.dispatch();

    expect(
      writes.some(({ sql }) =>
        sql.includes('INSERT INTO notification_deduplication'),
      ),
    ).toBe(false);
    expect(
      writes.some(
        ({ sql, params }) =>
          sql.includes('SET status = $2') && params?.[1] === 'suppressed',
      ),
    ).toBe(true);
  });

  it('schedules a retry when a delivery transaction fails', async () => {
    const { dispatcher, claimQuery } = createDispatcher('accepted', true);

    await dispatcher.dispatch();

    expect(claimQuery).toHaveBeenLastCalledWith(
      expect.stringContaining(
        "SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END",
      ),
      ['intent-1'],
    );
  });
});

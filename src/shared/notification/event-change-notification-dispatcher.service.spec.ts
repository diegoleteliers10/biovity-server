import { EventChangeNotificationDispatcherService } from './event-change-notification-dispatcher.service';
import { NotificationType } from '../../core/domain/enums';

describe('EventChangeNotificationDispatcherService', () => {
  type TransactionManagerStub = { query: jest.Mock };
  const intent = {
    id: 'intent-id',
    eventId: 'event-id',
    recipientId: 'recipient-id',
    action: 'updated' as const,
    eventTitle: 'Interview title',
    changeHistoryId: 'history-id',
  };
  let dataSource: {
    query: jest.Mock;
    transaction: jest.Mock;
  };
  let manager: { query: jest.Mock };
  let logger: { error: jest.Mock };
  let service: EventChangeNotificationDispatcherService;

  beforeEach(() => {
    manager = { query: jest.fn() };
    dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([intent]),
      transaction: jest.fn(
        (operation: (transactionManager: TransactionManagerStub) => unknown) =>
          Promise.resolve(operation(manager)),
      ),
    };
    logger = { error: jest.fn() };
    service = new EventChangeNotificationDispatcherService(
      dataSource as never,
      logger as never,
    );
  });

  it('delivers once with the live in-app preference and a history-based key', async () => {
    manager.query
      .mockResolvedValueOnce([
        { notification_preferences: { channels: {}, events: {} } },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO notification'),
      [
        intent.recipientId,
        NotificationType.INTERVIEW,
        'Evento actualizado',
        '“Interview title” fue actualizado',
        '/dashboard/calendar',
        JSON.stringify({
          eventId: intent.eventId,
          dedupKey: 'event:event-id:history:history-id',
        }),
        'event:event-id:history:history-id',
      ],
    );
    expect(manager.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining("SET status = 'accepted'"),
      [intent.id],
    );
  });

  it('suppresses delivery when the recipient disables interview notices', async () => {
    manager.query
      .mockResolvedValueOnce([
        {
          notification_preferences: {
            channels: {},
            events: { interview: false },
          },
        },
      ])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining("SET status = 'suppressed'"),
      [intent.id],
    );
  });

  it('schedules a retry after a delivery transaction fails', async () => {
    dataSource.transaction.mockRejectedValueOnce(new Error('database down'));
    dataSource.query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([intent])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(dataSource.query).toHaveBeenLastCalledWith(
      expect.stringContaining(
        "SET status = CASE WHEN attempt_count >= 8 THEN 'dead' ELSE 'retry' END",
      ),
      [intent.id],
    );
    expect(logger.error).toHaveBeenCalledWith(
      'Event change notification delivery failed for intent-id',
    );
  });
});

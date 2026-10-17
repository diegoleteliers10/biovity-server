import { NotificationType } from '../../core/domain/enums';
import { ApplicationCreatedNotificationDispatcherService } from './application-created-notification-dispatcher.service';

describe('ApplicationCreatedNotificationDispatcherService', () => {
  const intent = {
    id: 'intent-id',
    applicationId: 'application-id',
    recipientId: 'recruiter-id',
    jobId: 'job-id',
    candidateName: 'Candidate',
    jobTitle: 'Researcher',
  };
  let dataSource: { query: jest.Mock; transaction: jest.Mock };
  let manager: { query: jest.Mock };
  let logger: { error: jest.Mock };
  let service: ApplicationCreatedNotificationDispatcherService;

  beforeEach(() => {
    manager = { query: jest.fn() };
    dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([intent]),
      transaction: jest.fn(
        (operation: (transactionManager: { query: jest.Mock }) => unknown) =>
          Promise.resolve(operation(manager)),
      ),
    };
    logger = { error: jest.fn() };
    service = new ApplicationCreatedNotificationDispatcherService(
      dataSource as never,
      logger as never,
    );
  });

  it('creates one deduplicated notice and accepts the intent in one transaction', async () => {
    manager.query.mockResolvedValueOnce([
      { notification_preferences: { channels: {}, events: {} } },
    ]);

    await service.dispatch();

    expect(manager.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('INSERT INTO notification_deduplication'),
      [
        intent.recipientId,
        NotificationType.APPLICATION,
        'Nueva postulación',
        'Candidate postuló a Researcher',
        '/dashboard/applications',
        JSON.stringify({
          applicationId: intent.applicationId,
          jobId: intent.jobId,
          dedupKey: `app:${intent.applicationId}:created`,
        }),
        `app:${intent.applicationId}:created`,
      ],
    );
    expect(manager.query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining('SET status = $2'),
      [intent.id, 'accepted'],
    );
    expect(dataSource.query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FOR UPDATE SKIP LOCKED'),
    );
  });

  it('suppresses notices when the recipient disables application alerts', async () => {
    manager.query.mockResolvedValueOnce([
      {
        notification_preferences: {
          channels: {},
          events: { application: false },
        },
      },
    ]);

    await service.dispatch();

    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = $2'),
      [intent.id, 'suppressed'],
    );
  });

  it('suppresses notices when the recipient no longer exists', async () => {
    manager.query.mockResolvedValueOnce([]);

    await service.dispatch();

    expect(manager.query).toHaveBeenCalledTimes(2);
    expect(manager.query).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = $2'),
      [intent.id, 'suppressed'],
    );
  });

  it('schedules a retry when the delivery transaction fails', async () => {
    dataSource.transaction.mockRejectedValueOnce(new Error('database down'));
    dataSource.query.mockResolvedValueOnce([]).mockResolvedValueOnce([intent]);

    await service.dispatch();

    expect(dataSource.query).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = CASE WHEN attempt_count >= 8'),
      [intent.id],
    );
    expect(dataSource.query).toHaveBeenLastCalledWith(
      expect.stringContaining('power(2, attempt_count)'),
      [intent.id],
    );
  });
});

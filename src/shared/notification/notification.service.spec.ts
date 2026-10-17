import { DataSource } from 'typeorm';
import { NotificationService } from './notification.service';
import { NotificationType } from '../../core/domain/enums';
import type { CreateNotificationInput } from './notification.types';

type QueryMock = jest.MockedFunction<
  (sql: string, params?: unknown[]) => Promise<unknown>
>;
type TransactionManagerMock = { query: QueryMock };
type TransactionMock = jest.MockedFunction<
  (
    operation: (manager: TransactionManagerMock) => Promise<unknown>,
  ) => Promise<unknown>
>;

const createQueryMock = (): QueryMock =>
  jest.fn((_sql: string, _params?: unknown[]) => Promise.resolve([]));

describe('NotificationService', () => {
  let service: NotificationService;
  let query: QueryMock;
  let loggerError: jest.MockedFunction<
    (message: string, trace?: string, context?: string) => void
  >;
  let transaction: TransactionMock;

  beforeEach(() => {
    query = createQueryMock();
    loggerError = jest.fn();
    transaction = jest.fn(operation => operation({ query: createQueryMock() }));

    service = new NotificationService(
      { query, transaction } as unknown as DataSource,
      { error: loggerError } as never,
    );
  });

  const baseInput: CreateNotificationInput = {
    userId: 'user-1',
    type: NotificationType.SYSTEM,
    title: 'Hola',
    body: 'mensaje',
    link: '/dashboard',
    data: { jobId: 'job-1' },
  };

  it('inserts with the plain query when no dedupKey', async () => {
    await service.create(baseInput);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][0]).toContain('SELECT notification_preferences');
    const [sql, params] = query.mock.calls[1];
    expect(sql).toContain('INSERT INTO notification');
    expect(sql).not.toContain('WHERE NOT EXISTS');
    expect(params).toHaveLength(6);
    expect(params?.[0]).toBe('user-1');
    expect(params?.[1]).toBe(NotificationType.SYSTEM);
    expect(params?.[4]).toBe('/dashboard');
    expect(JSON.parse(params?.[5] as string)).toEqual({ jobId: 'job-1' });
  });

  it('uses the idempotency guard and embeds dedupKey in data', async () => {
    await service.create({ ...baseInput, dedupKey: 'app:1:created' });

    expect(query).toHaveBeenCalledTimes(2);
    const [sql, params] = query.mock.calls[1];
    expect(sql).toContain('INSERT INTO notification_deduplication');
    expect(sql).toContain('ON CONFLICT (user_id, type, dedup_key) DO UPDATE');
    expect(sql).toContain('FROM eligible_dedup');
    expect(sql).toContain('WHERE NOT EXISTS');
    expect(sql).toContain("data->>'dedupKey'");
    expect(params).toHaveLength(8);
    expect(params?.[6]).toBe('app:1:created');
    expect(params?.[7]).toBe('1 hour');
    expect(JSON.parse(params?.[5] as string)).toEqual({
      jobId: 'job-1',
      dedupKey: 'app:1:created',
    });
  });

  it('swallows insert errors and logs them (best-effort)', async () => {
    query
      .mockResolvedValueOnce([{ notification_preferences: null }])
      .mockRejectedValueOnce(new Error('db down'));

    await expect(
      service.create({ ...baseInput, dedupKey: 'app:1:created' }),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledTimes(1);
    expect(loggerError.mock.calls[0][0]).toContain('db down');
  });

  it('createMany fans out to create for every input', async () => {
    await service.createMany([
      { ...baseInput, userId: 'a' },
      { ...baseInput, userId: 'b' },
    ]);

    const inserts = query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO notification'),
    );
    expect(query).toHaveBeenCalledTimes(4);
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1]?.[0]).toBe('a');
    expect(inserts[1][1]?.[0]).toBe('b');
  });

  it('creates a deduplicated system notification for active admins', async () => {
    query
      .mockResolvedValueOnce([{ id: 'admin-1' }])
      .mockResolvedValueOnce([{ notification_preferences: null }]);

    await service.createForAdmins({
      type: NotificationType.SYSTEM,
      title: 'Nueva solicitud de verificación',
      body: 'Solicitud de Example SpA',
      link: '/dashboard/organizations',
      data: { organizationId: 'org-1', requestId: 'request-1' },
      dedupKey: 'organization-verification:request-1',
    });

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[0][0]).toContain("type = 'admin'");
    expect(query.mock.calls[0][0]).toContain('"isActive" = true');
    expect(query.mock.calls[1][1]?.[0]).toBe('admin-1');
    expect(query.mock.calls[2][1]?.[0]).toBe('admin-1');
    expect(query.mock.calls[2][1]?.[6]).toBe(
      'organization-verification:request-1',
    );
  });

  it('logs admin recipient lookup failures without rejecting', async () => {
    query.mockRejectedValueOnce(new Error('admin lookup failed'));

    await expect(
      service.createForAdmins({
        type: NotificationType.SYSTEM,
        title: 'Nueva solicitud de verificación',
      }),
    ).resolves.toBeUndefined();

    expect(loggerError).toHaveBeenCalledWith(
      expect.stringContaining('admin lookup failed'),
      expect.any(String),
      'NotificationService',
    );
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('delivers a claimed application status intent with preferences and deduplication', async () => {
    const intent = {
      id: 'history-id',
      applicationId: 'application-id',
      recipientId: 'candidate-id',
      jobId: 'job-id',
      applicationStatus: 'entrevista',
      jobTitle: 'Lab role',
      statusLabel: 'Entrevista',
      statusHistoryId: 'history-id',
    };
    query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([intent]);
    const managerQuery = createQueryMock()
      .mockResolvedValueOnce([{ notification_preferences: null }])
      .mockResolvedValue(undefined);
    transaction.mockImplementationOnce(operation =>
      operation({ query: managerQuery }),
    );

    await service.dispatchApplicationStatusNotifications();

    expect(query.mock.calls[1][0]).toContain('FOR UPDATE SKIP LOCKED');
    expect(transaction).toHaveBeenCalledTimes(1);
    expect(managerQuery.mock.calls[1][0]).toContain(
      'INSERT INTO notification_deduplication',
    );
    expect(managerQuery.mock.calls[2][0]).toContain("SET status = 'accepted'");
    expect(managerQuery.mock.calls[1][1]?.[0]).toBe('candidate-id');
    expect(managerQuery.mock.calls[1][1]?.[3]).toBe(
      'Tu postulación a Lab role pasó a Entrevista',
    );
  });

  it('retries when notification delivery fails', async () => {
    query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
      {
        id: 'history-id',
        applicationId: 'application-id',
        recipientId: 'candidate-id',
        jobId: 'job-id',
        applicationStatus: 'entrevista',
        jobTitle: 'Lab role',
        statusLabel: 'Entrevista',
        statusHistoryId: 'history-id',
      },
    ]);
    const managerQuery = createQueryMock()
      .mockResolvedValueOnce([{ notification_preferences: null }])
      .mockRejectedValueOnce(new Error('database unavailable'));
    transaction.mockImplementationOnce(operation =>
      operation({ query: managerQuery }),
    );

    await service.dispatchApplicationStatusNotifications();

    expect(query).toHaveBeenCalledTimes(3);
    expect(query.mock.calls[2][0]).toContain("ELSE 'retry'");
    expect(query.mock.calls[2][1]).toEqual(['history-id']);
  });

  it('marks an intent suppressed when the candidate disabled in-app alerts', async () => {
    query.mockResolvedValueOnce(undefined).mockResolvedValueOnce([
      {
        id: 'history-id',
        applicationId: 'application-id',
        recipientId: 'candidate-id',
        jobId: 'job-id',
        applicationStatus: 'entrevista',
        jobTitle: 'Lab role',
        statusLabel: 'Entrevista',
        statusHistoryId: 'history-id',
      },
    ]);
    const managerQuery = createQueryMock()
      .mockResolvedValueOnce([
        { notification_preferences: { channels: { in_app: false } } },
      ])
      .mockResolvedValueOnce(undefined);
    transaction.mockImplementationOnce(operation =>
      operation({ query: managerQuery }),
    );

    await service.dispatchApplicationStatusNotifications();

    expect(managerQuery).toHaveBeenCalledTimes(2);
    expect(managerQuery.mock.calls[1][0]).toContain(
      "SET status = 'suppressed'",
    );
  });

  it('skips insert when the in-app channel is disabled', async () => {
    query.mockResolvedValueOnce([
      { notification_preferences: { channels: { in_app: false } } },
    ]);

    await service.create(baseInput);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('SELECT notification_preferences');
  });

  it('skips insert when this notification event is disabled', async () => {
    query.mockResolvedValueOnce([
      { notification_preferences: { events: { system: false } } },
    ]);

    await service.create(baseInput);

    expect(query).toHaveBeenCalledTimes(1);
    expect(query.mock.calls[0][0]).toContain('SELECT notification_preferences');
  });

  it('inserts when the user has no saved preferences', async () => {
    query.mockResolvedValueOnce([{ notification_preferences: null }]);

    await service.create(baseInput);

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1][0]).toContain('INSERT INTO notification');
  });

  it('createMany does nothing for an empty list', async () => {
    await service.createMany([]);
    expect(query).not.toHaveBeenCalled();
  });

  it('sends weekday reminders for overdue or stale open applications', async () => {
    query.mockImplementation(sql => {
      if (sql.includes('FROM application')) {
        return Promise.resolve([
          {
            applicationId: 'overdue-application',
            candidateName: 'Ana',
            jobId: 'job-1',
            jobTitle: 'Diseñadora',
            recipientId: 'recruiter-1',
            stageAgeDays: 2,
            targetDate: '2026-10-08',
            nextAction: 'Coordinar entrevista',
            reminderDate: '2026-10-09',
            isOverdue: true,
          },
          {
            applicationId: 'stale-application',
            candidateName: 'Luis',
            jobId: 'job-2',
            jobTitle: 'Analista',
            recipientId: 'owner-1',
            stageAgeDays: 8,
            targetDate: null,
            nextAction: null,
            reminderDate: '2026-10-09',
            isOverdue: false,
          },
        ]);
      }
      if (sql.includes('SELECT notification_preferences')) {
        return Promise.resolve([{ notification_preferences: null }]);
      }
      return Promise.resolve(undefined);
    });

    await service.sendHiringPlanReminders();

    const reminderQuery = query.mock.calls.find(([sql]) =>
      sql.includes('FROM application'),
    );
    expect(reminderQuery?.[0]).toContain("INTERVAL '7 days'");
    expect(reminderQuery?.[0]).toContain('COALESCE(assignee.id, owner.id)');
    expect(reminderQuery?.[0]).toContain(
      "eligible_assignee.role IN ('admin', 'recruiter')",
    );
    expect(reminderQuery?.[0]).toContain("assignee.type = 'organization'");
    expect(reminderQuery?.[0]).toContain("owner.type = 'organization'");
    expect(reminderQuery?.[0]).toContain(
      "application.status NOT IN ('contratado', 'rechazado', 'desistido')",
    );
    const inserts = query.mock.calls.filter(([sql]) =>
      sql.includes('INSERT INTO notification'),
    );
    expect(inserts).toHaveLength(2);
    expect(inserts[0][1]?.[0]).toBe('recruiter-1');
    expect(inserts[0][1]?.[2]).toBe('Candidatura con fecha vencida');
    expect(inserts[0][1]?.[4]).toBe(
      '/dashboard/offers/job-1/applications/overdue-application',
    );
    expect(inserts[0][1]?.[6]).toBe(
      'application-reminder:overdue-application:2026-10-09',
    );
    expect(inserts[0][1]?.[7]).toBe('25 hours');
    expect(inserts[1][1]?.[0]).toBe('owner-1');
    expect(inserts[1][1]?.[2]).toBe('Candidatura sin movimiento');
  });

  it('cleans expired deduplication reservations', async () => {
    await service.deleteExpiredDeduplicationKeys();

    expect(query).toHaveBeenCalledWith(
      'DELETE FROM notification_deduplication WHERE expires_at <= now()',
    );
  });
});

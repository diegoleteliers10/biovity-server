import { DataSource } from 'typeorm';
import { NotificationService } from './notification.service';
import { NotificationType } from '../../core/domain/enums';
import type { CreateNotificationInput } from './notification.types';

describe('NotificationService', () => {
  let service: NotificationService;
  let query: jest.MockedFunction<
    (sql: string, params?: unknown[]) => Promise<unknown>
  >;
  let loggerError: jest.MockedFunction<
    (message: string, trace?: string, context?: string) => void
  >;

  beforeEach(() => {
    query = jest.fn().mockResolvedValue(undefined);
    loggerError = jest.fn();

    service = new NotificationService(
      { query } as unknown as DataSource,
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

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
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

    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0];
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
    query.mockRejectedValueOnce(new Error('db down'));

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

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[0][1]?.[0]).toBe('a');
    expect(query.mock.calls[1][1]?.[0]).toBe('b');
  });

  it('createMany does nothing for an empty list', async () => {
    await service.createMany([]);
    expect(query).not.toHaveBeenCalled();
  });
});

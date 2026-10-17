import type { DataSource, EntityManager } from 'typeorm';
import type { LoggerService } from '@nestjs/common';
import { SystemBroadcastNotificationDispatcherService } from './system-broadcast-notification-dispatcher.service';

describe('SystemBroadcastNotificationDispatcherService', () => {
  const managerQuery = jest.fn();
  const manager = { query: managerQuery } as unknown as EntityManager;
  const query = jest.fn();
  const transaction = jest.fn(
    async (callback: (transactionManager: EntityManager) => Promise<unknown>) =>
      callback(manager),
  );
  const logger = { error: jest.fn() } as unknown as LoggerService;
  const service = new SystemBroadcastNotificationDispatcherService(
    { query, transaction } as unknown as DataSource,
    logger,
  );

  beforeEach(() => {
    query.mockReset();
    managerQuery.mockReset();
    transaction.mockClear();
    jest.mocked(logger.error).mockClear();
  });

  it('delivers once after checking current membership and system preferences', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'intent-id',
        broadcastId: 'broadcast-id',
        recipientId: 'recipient-id',
      },
    ]);
    managerQuery
      .mockResolvedValueOnce([
        {
          organizationId: 'organization-id',
          title: 'Aviso',
          body: 'Mensaje',
          actorUserId: 'admin-id',
          ownerOrganizationId: null,
          isActive: true,
          notification_preferences: {
            channels: { in_app: true },
            events: { system: true },
          },
        },
      ])
      .mockResolvedValueOnce([{ id: 'membership-id' }])
      .mockResolvedValueOnce([{ id: 'intent-id' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(managerQuery).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('FROM organization_member'),
      ['organization-id', 'recipient-id'],
    );
    expect(managerQuery).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO notification'),
      expect.arrayContaining([
        'recipient-id',
        'system',
        'system_broadcast:broadcast-id:recipient-id',
        'Aviso',
        'Mensaje',
      ]),
    );
    expect(managerQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = $2'),
      ['intent-id', 'accepted'],
    );
  });

  it('suppresses a notice when the member opts out', async () => {
    query.mockResolvedValueOnce([]).mockResolvedValueOnce([
      {
        id: 'intent-id',
        broadcastId: 'broadcast-id',
        recipientId: 'recipient-id',
      },
    ]);
    managerQuery
      .mockResolvedValueOnce([
        {
          organizationId: 'organization-id',
          title: 'Aviso',
          body: 'Mensaje',
          actorUserId: 'admin-id',
          ownerOrganizationId: null,
          isActive: true,
          notification_preferences: {
            channels: { in_app: false },
            events: { system: true },
          },
        },
      ])
      .mockResolvedValueOnce([{ id: 'membership-id' }])
      .mockResolvedValueOnce([]);

    await service.dispatch();

    expect(managerQuery).toHaveBeenCalledTimes(3);
    expect(managerQuery).toHaveBeenLastCalledWith(
      expect.stringContaining('SET status = $2'),
      ['intent-id', 'suppressed'],
    );
  });
});

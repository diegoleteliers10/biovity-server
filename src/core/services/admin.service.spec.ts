import type { DataSource, EntityManager, Repository } from 'typeorm';
import {
  ApplicationEntity,
  JobEntity,
  OrganizationEntity,
  UserEntity,
  WaitlistEntity,
} from '../../infrastructure/database/orm';
import { AdminService } from './admin.service';

describe('AdminService system notification broadcasts', () => {
  const query = jest.fn();
  const manager = { query } as unknown as EntityManager;
  const dataSource = {
    transaction: jest.fn(
      (callback: (transaction: EntityManager) => Promise<unknown>) =>
        callback(manager),
    ),
  } as unknown as DataSource;
  const service = new AdminService(
    {} as Repository<UserEntity>,
    {} as Repository<WaitlistEntity>,
    {} as Repository<ApplicationEntity>,
    {} as Repository<JobEntity>,
    {} as Repository<OrganizationEntity>,
    dataSource,
  );

  beforeEach(() => {
    query.mockReset();
  });

  it('stores a broadcast and all active organization members in one transaction', async () => {
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'organization-id' }])
      .mockResolvedValueOnce([{ id: 'broadcast-id' }])
      .mockResolvedValueOnce([{ id: 'intent-1' }, { id: 'intent-2' }]);

    await expect(
      service.broadcastSystemNotification(
        'organization-id',
        'Aviso',
        'Mensaje',
        'admin-id',
        'request-id',
      ),
    ).resolves.toEqual({
      status: 'queued',
      broadcastId: 'broadcast-id',
      queued: 2,
    });

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenNthCalledWith(
      3,
      expect.stringContaining(
        'ON CONFLICT (actor_user_id, request_id) DO NOTHING',
      ),
      ['organization-id', 'admin-id', 'request-id', 'Aviso', 'Mensaje'],
    );
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('FROM organization_member member'),
      ['broadcast-id', 'organization-id'],
    );
  });

  it('returns the existing result when the request ID repeats with the same payload', async () => {
    query
      .mockResolvedValueOnce([
        {
          id: 'broadcast-id',
          organizationId: 'organization-id',
          title: 'Aviso',
          body: 'Mensaje',
        },
      ])
      .mockResolvedValueOnce([{ count: 3 }]);

    await expect(
      service.broadcastSystemNotification(
        'organization-id',
        'Aviso',
        'Mensaje',
        'admin-id',
        'request-id',
      ),
    ).resolves.toEqual({
      status: 'replayed',
      broadcastId: 'broadcast-id',
      queued: 3,
    });
    expect(query).toHaveBeenCalledTimes(2);
  });

  it('rejects reuse of a request ID with a different payload', async () => {
    query.mockResolvedValueOnce([
      {
        id: 'broadcast-id',
        organizationId: 'organization-id',
        title: 'Aviso original',
        body: 'Mensaje original',
      },
    ]);

    await expect(
      service.broadcastSystemNotification(
        'organization-id',
        'Aviso cambiado',
        'Mensaje cambiado',
        'admin-id',
        'request-id',
      ),
    ).resolves.toEqual({ status: 'request_id_conflict' });
    expect(query).toHaveBeenCalledTimes(1);
  });
});

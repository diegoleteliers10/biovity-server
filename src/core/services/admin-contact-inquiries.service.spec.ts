import { BadRequestException } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { AdminContactInquiriesService } from './admin-contact-inquiries.service';

const inquiry = {
  id: '17',
  nombre: 'Ada',
  apellido: 'Lovelace',
  email: 'ada@example.com',
  telefono: null,
  empresa: 'Analytical Engines',
  mensaje: 'Consulta',
  is_read: false,
  created_at: new Date('2026-10-01T12:00:00Z'),
  status: 'open' as const,
  assigned_admin_id: null,
  assignee_name: null,
  follow_up_at: null,
  resolution_note: null,
  resolved_at: null,
  resolved_by_id: null,
  updated_at: new Date('2026-10-01T12:00:00Z'),
};

describe('AdminContactInquiriesService', () => {
  it('lists active administrators with the shared user column name', async () => {
    const query = jest.fn().mockResolvedValueOnce([]);
    const dataSource = { query } as unknown as DataSource;
    const service = new AdminContactInquiriesService(dataSource);

    await service.listOperators();

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('"isActive" = true'),
    );
  });

  it('applies bounded pagination and queue filters', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([inquiry]);
    const dataSource = {
      query,
    } as unknown as DataSource;
    const service = new AdminContactInquiriesService(dataSource);

    const result = await service.list({
      page: 2,
      limit: 10,
      search: 'Ada',
      status: 'open',
      assigneeId: 'admin-uuid',
      overdue: true,
    });

    expect(result).toMatchObject({ total: 1, page: 2, limit: 10 });
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('m.follow_up_at < CURRENT_DATE'),
      ['%Ada%', 'open', 'admin-uuid'],
    );
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('LIMIT $4 OFFSET $5'),
      ['%Ada%', 'open', 'admin-uuid', 10, 10],
    );
  });

  it('filters unassigned inquiries when requested', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '1' }])
      .mockResolvedValueOnce([inquiry]);
    const dataSource = { query } as unknown as DataSource;
    const service = new AdminContactInquiriesService(dataSource);

    const result = await service.list({ page: 1, limit: 20, unassigned: true });

    expect(result.total).toBe(1);
    expect(query).toHaveBeenNthCalledWith(
      1,
      expect.stringContaining('m.assigned_admin_id IS NULL'),
      [],
    );
  });

  it('requires a resolution note and writes no partial update', async () => {
    const query = jest.fn().mockResolvedValueOnce([inquiry]);
    const manager = {
      query,
    } as unknown as EntityManager;
    const transaction = jest.fn(
      (operation: (entityManager: EntityManager) => Promise<unknown>) =>
        operation(manager),
    );
    const dataSource = {
      transaction,
    } as unknown as DataSource;
    const service = new AdminContactInquiriesService(dataSource);

    await expect(
      service.update(17, 'actor-uuid', { status: 'resolved' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('writes the update and audit event in the same transaction', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([inquiry])
      .mockResolvedValueOnce([{ id: 'active-admin' }])
      .mockResolvedValueOnce([
        {
          ...inquiry,
          status: 'resolved',
          assigned_admin_id: 'active-admin',
          resolution_note: 'Se respondió al cliente',
          resolved_at: new Date('2026-10-09T10:00:00Z'),
          resolved_by_id: 'actor-uuid',
        },
      ])
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce([]);
    const manager = {
      query,
    } as unknown as EntityManager;
    const transaction = jest.fn(
      (operation: (entityManager: EntityManager) => Promise<unknown>) =>
        operation(manager),
    );
    const dataSource = {
      transaction,
    } as unknown as DataSource;
    const service = new AdminContactInquiriesService(dataSource);

    const result = await service.update(17, 'actor-uuid', {
      status: 'resolved',
      resolutionNote: 'Se respondió al cliente',
      assignedAdminId: 'active-admin',
    });

    expect(result).toMatchObject({ status: 'resolved', assigneeName: null });
    expect(query).toHaveBeenCalledTimes(5);
    expect(query).toHaveBeenNthCalledWith(
      2,
      expect.stringContaining('"isActive" = true'),
      ['active-admin'],
    );
    expect(query).toHaveBeenNthCalledWith(
      4,
      expect.stringContaining('INSERT INTO contact_message_events'),
      [
        17,
        'actor-uuid',
        'open',
        'resolved',
        null,
        'active-admin',
        null,
        null,
        'Se respondió al cliente',
      ],
    );
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});

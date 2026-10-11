import { DataSource } from 'typeorm';
import { AdminOperationsQueueService } from './admin-operations-queue.service';
import { OperationsQueueQueryDto } from '../../interfaces/dtos/admin/operations-queue.dto';

describe('AdminOperationsQueueService', () => {
  const calls: Array<{ sql: string; parameters: unknown[] }> = [];
  const query = jest.fn((sql: string, parameters: unknown[] = []) => {
    calls.push({ sql, parameters });
    return Promise.resolve([] as unknown[]);
  });
  const service = new AdminOperationsQueueService({
    query,
  } as unknown as DataSource);

  beforeEach(() => {
    query.mockReset();
    calls.length = 0;
    query.mockImplementation((sql: string, parameters: unknown[] = []) => {
      calls.push({ sql, parameters });
      return Promise.resolve([] as unknown[]);
    });
  });

  it('returns bounded, paged, typed queue rows for the selected type', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'application-id',
            kind: 'application_follow_up',
            reason: 'missing_action',
            title: 'Analista',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: 'candidate-id',
            candidateName: 'Ada',
            applicationId: 'application-id',
            status: 'pendiente',
            stageName: 'Entrevista',
            nextAction: null,
            targetDate: null,
            expiresAt: null,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      page: 3,
      limit: 200,
      type: 'application_follow_up' as const,
      search: ' Ada ',
    });

    const result = await service.list(input);

    expect(result).toMatchObject({
      page: 3,
      limit: 50,
      total: 1,
      totalPages: 1,
    });
    expect(result.data[0]).toMatchObject({
      id: 'application-id',
      kind: 'application_follow_up',
      reason: 'missing_action',
    });
    expect(calls[0]?.sql).toContain(
      `job.status = 'active' AND job."expiresAt"::date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date`,
    );
    expect(calls[0]?.sql).toContain(
      "application.status NOT IN ('rechazado', 'contratado', 'desistido')",
    );
    expect(calls[0]?.sql).toContain('application.next_action IS NULL');
    expect(calls[0]?.sql).toContain(
      "application.target_date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date",
    );
    expect(calls[0]?.sql).toContain(
      "THEN 'missing_action' ELSE 'overdue_action' END::text AS reason",
    );
    expect(calls[0]?.sql).toContain(
      "application.status NOT IN ('rechazado', 'contratado', 'desistido')",
    );
    expect(calls[1]?.parameters).toEqual([
      'application_follow_up',
      '%Ada%',
      50,
      100,
    ]);
  });

  it('labels overdue actions when the action exists and the Chile date has passed', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'application-id',
            kind: 'application_follow_up',
            reason: 'overdue_action',
            title: 'Analista',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: 'candidate-id',
            candidateName: 'Ada',
            applicationId: 'application-id',
            status: 'pendiente',
            stageName: 'Entrevista',
            nextAction: 'Agendar llamada',
            targetDate: '2026-10-08',
            expiresAt: null,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });

    const result = await service.list(new OperationsQueueQueryDto());

    expect(result.data[0]).toMatchObject({
      reason: 'overdue_action',
      nextAction: 'Agendar llamada',
      targetDate: '2026-10-08',
    });
    expect(calls[0]?.sql).toContain(
      "application.target_date < (CURRENT_TIMESTAMP AT TIME ZONE 'America/Santiago')::date",
    );
  });

  it('uses bounded default pagination and reports an empty page', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 0 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([]);
      });

    const result = await service.list(new OperationsQueueQueryDto());

    expect(result).toEqual({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
    });
  });

  it('lists organizations without active jobs through the read-only queue query', async () => {
    query
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([{ total: 1 }]);
      })
      .mockImplementationOnce((sql: string, parameters: unknown[] = []) => {
        calls.push({ sql, parameters });
        return Promise.resolve([
          {
            id: 'organization-id',
            kind: 'organization_without_active_jobs',
            reason: 'no_active_jobs',
            title: 'BioVity',
            organizationId: 'organization-id',
            organizationName: 'BioVity',
            candidateId: null,
            candidateName: null,
            applicationId: null,
            status: 'none',
            stageName: null,
            nextAction: null,
            targetDate: null,
            expiresAt: null,
            createdAt: '2026-10-01T00:00:00.000Z',
          },
        ]);
      });
    const input = Object.assign(new OperationsQueueQueryDto(), {
      type: 'organization_without_active_jobs',
      page: 2,
      limit: 10,
      search: 'BioVity',
    });

    const result = await service.list(input);

    expect(result.data[0]).toMatchObject({
      id: 'organization-id',
      kind: 'organization_without_active_jobs',
      reason: 'no_active_jobs',
      organizationName: 'BioVity',
    });
    expect(calls[0]?.sql.replace(/\s+/g, ' ')).toContain(
      `FROM organization organization WHERE NOT EXISTS ( SELECT 1 FROM job active_job WHERE active_job."organizationId" = organization.id AND active_job.status = 'active' )`,
    );
    expect(calls[1]?.parameters).toEqual([
      'organization_without_active_jobs',
      '%BioVity%',
      10,
      10,
    ]);
  });
});

import type { Repository } from 'typeorm';
import {
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
  EventEntity,
  JobEntity,
  OrganizationMemberEntity,
} from '../../infrastructure/database/orm';
import { EventStatus } from '../domain/enums';
import { OrganizationMetricsService } from './organization-metrics.service';

const makeQueryBuilder = (result: {
  count?: number;
  rows?: {
    changedById: string;
    responseDays: string;
  }[];
}) => {
  const builder = {
    innerJoin: jest.fn(),
    where: jest.fn(),
    andWhere: jest.fn(),
    select: jest.fn(),
    addSelect: jest.fn(),
    groupBy: jest.fn(),
    addGroupBy: jest.fn(),
    distinctOn: jest.fn(),
    orderBy: jest.fn(),
    addOrderBy: jest.fn(),
    getCount: jest.fn().mockResolvedValue(result.count ?? 0),
    getRawMany: jest.fn().mockResolvedValue(result.rows ?? []),
    getRawOne: jest
      .fn()
      .mockResolvedValue({ count: String(result.count ?? 0) }),
  };
  builder.innerJoin.mockReturnValue(builder);
  builder.where.mockReturnValue(builder);
  builder.andWhere.mockReturnValue(builder);
  builder.select.mockReturnValue(builder);
  builder.addSelect.mockReturnValue(builder);
  builder.groupBy.mockReturnValue(builder);
  builder.addGroupBy.mockReturnValue(builder);
  builder.distinctOn.mockReturnValue(builder);
  builder.orderBy.mockReturnValue(builder);
  builder.addOrderBy.mockReturnValue(builder);
  return builder;
};

describe('OrganizationMetricsService recruiter productivity', () => {
  it('attributes transitions, completed interviews, and response time to each member', async () => {
    const historyQueryQueue = [
      makeQueryBuilder({
        rows: [
          {
            changedById: 'recruiter-1',
            responseDays: '1',
          },
          {
            changedById: 'recruiter-1',
            responseDays: '3',
          },
        ],
      }),
      makeQueryBuilder({ count: 3 }),
      makeQueryBuilder({ count: 1 }),
    ];
    const historyQueries = [...historyQueryQueue];
    const interviewQueryQueue = [
      makeQueryBuilder({ count: 2 }),
      makeQueryBuilder({ count: 1 }),
    ];
    const interviewQueries = [...interviewQueryQueue];
    const statusHistoryRepository = {
      createQueryBuilder: jest
        .fn()
        .mockImplementation(() => historyQueryQueue.shift()),
    } as unknown as Repository<ApplicationStatusHistoryEntity>;
    const eventRepository = {
      createQueryBuilder: jest
        .fn()
        .mockImplementation(() => interviewQueryQueue.shift()),
    } as unknown as Repository<EventEntity>;
    const memberRepository = {
      find: jest.fn().mockResolvedValue([
        {
          userId: 'recruiter-1',
          user: { name: 'One', email: 'one@example.com' },
        },
        {
          userId: 'recruiter-2',
          user: { name: 'Two', email: 'two@example.com' },
        },
      ]),
    } as unknown as Repository<OrganizationMemberEntity>;
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      eventRepository,
      memberRepository,
      statusHistoryRepository,
      {} as never,
    );

    const result = await service.getRecruiterProductivity(
      'organization-id',
      '2026-01-01',
      '2026-01-31',
    );

    expect(result).toEqual([
      {
        userId: 'recruiter-1',
        userName: 'One',
        userEmail: 'one@example.com',
        applicationsProcessed: 3,
        interviewsConducted: 2,
        avgResponseTimeDays: 2,
      },
      {
        userId: 'recruiter-2',
        userName: 'Two',
        userEmail: 'two@example.com',
        applicationsProcessed: 1,
        interviewsConducted: 1,
        avgResponseTimeDays: 0,
      },
    ]);
    expect(statusHistoryRepository.createQueryBuilder).toHaveBeenCalledTimes(3);
    expect(eventRepository.createQueryBuilder).toHaveBeenCalledTimes(2);
    expect(historyQueries[0]?.andWhere).toHaveBeenCalledWith(
      'history.changedById IS NOT NULL',
    );
    expect(historyQueries[0]?.andWhere).toHaveBeenCalledWith(
      'history.transitionKind = :stageTransition',
      { stageTransition: 'stage' },
    );
    expect(historyQueries[0]?.andWhere).toHaveBeenCalledWith(
      'history.previousStageId <> history.newStageId',
    );
    expect(historyQueries[0]?.andWhere).toHaveBeenCalledWith(
      'history.changedById <> application.candidateId',
    );
    expect(historyQueries[0]?.andWhere).toHaveBeenCalledWith(
      'history.changedAt >= application.createdAt',
    );
    expect(historyQueries[0]?.distinctOn).toHaveBeenCalledWith([
      'application.id',
    ]);
    expect(historyQueries[0]?.orderBy).toHaveBeenCalledWith(
      'application.id',
      'ASC',
    );
    expect(historyQueries[0]?.addOrderBy).toHaveBeenNthCalledWith(
      1,
      'history.changedAt',
      'ASC',
    );
    expect(historyQueries[0]?.addOrderBy).toHaveBeenNthCalledWith(
      2,
      'history.id',
      'ASC',
    );
    expect(historyQueries[0]?.andWhere).toHaveBeenCalledWith(
      "((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= CAST(:customStart AS date)",
      { customStart: '2026-01-01' },
    );
    expect(historyQueries[0]?.andWhere).toHaveBeenCalledWith(
      "((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < (CAST(:customEnd AS date) + INTERVAL '1 day')",
      { customEnd: '2026-01-31' },
    );
    expect(historyQueries[1]?.andWhere).toHaveBeenCalledWith(
      'history.changedById = :userId',
      { userId: 'recruiter-1' },
    );
    expect(historyQueries[2]?.andWhere).toHaveBeenCalledWith(
      'history.changedById = :userId',
      { userId: 'recruiter-2' },
    );
    expect(historyQueries[1]?.andWhere).toHaveBeenCalledWith(
      "((history.changedAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= CAST(:customStart AS date)",
      { customStart: '2026-01-01' },
    );
    expect(historyQueries[2]?.andWhere).toHaveBeenCalledWith(
      "((history.changedAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < (CAST(:customEnd AS date) + INTERVAL '1 day')",
      { customEnd: '2026-01-31' },
    );
    expect(interviewQueries[0]?.andWhere).toHaveBeenCalledWith(
      'event.organizerId = :userId',
      { userId: 'recruiter-1' },
    );
    expect(interviewQueries[0]?.andWhere).toHaveBeenCalledWith(
      'event.status = :status',
      { status: EventStatus.COMPLETED },
    );
    expect(interviewQueries[0]?.andWhere).toHaveBeenCalledWith(
      "event.startAt >= (CAST(:customStart AS date)::timestamp AT TIME ZONE 'America/Santiago')",
      { customStart: '2026-01-01' },
    );
    expect(interviewQueries[0]?.andWhere).toHaveBeenCalledWith(
      "event.startAt < ((CAST(:customEnd AS date) + INTERVAL '1 day')::timestamp AT TIME ZONE 'America/Santiago')",
      { customEnd: '2026-01-31' },
    );
  });

  it('returns no recruiter metrics and skips activity queries when no members exist', async () => {
    const statusHistoryRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as Repository<ApplicationStatusHistoryEntity>;
    const eventRepository = {
      createQueryBuilder: jest.fn(),
    } as unknown as Repository<EventEntity>;
    const memberRepository = {
      find: jest.fn().mockResolvedValue([]),
    } as unknown as Repository<OrganizationMemberEntity>;
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      eventRepository,
      memberRepository,
      statusHistoryRepository,
      {} as never,
    );

    await expect(
      service.getRecruiterProductivity('organization-id'),
    ).resolves.toEqual([]);
    expect(statusHistoryRepository.createQueryBuilder).not.toHaveBeenCalled();
    expect(eventRepository.createQueryBuilder).not.toHaveBeenCalled();
  });
});

describe('OrganizationMetricsService stage duration visits', () => {
  it('uses the metric cohort and returns a stable, bounded page of source visits', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: 21 }])
      .mockResolvedValueOnce([
        {
          visitId: 'visit-1',
          applicationId: 'application-1',
          applicantName: 'Candidate One',
          enteredAt: '2026-01-05T15:00:00Z',
          exitedAt: '2026-01-06T15:00:00Z',
          durationDays: '1',
        },
      ]);
    const statusHistoryRepository = {
      query,
    } as unknown as Repository<ApplicationStatusHistoryEntity>;
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      statusHistoryRepository,
      {} as never,
    );

    const result = await service.getStageDurationVisits(
      'organization-1',
      'job-1',
      'stage-1',
      '2026-01-01',
      '2026-01-31',
      2,
      20,
    );

    expect(result).toEqual({
      rows: [
        {
          visitId: 'visit-1',
          applicationId: 'application-1',
          applicantName: 'Candidate One',
          enteredAt: '2026-01-05T15:00:00Z',
          exitedAt: '2026-01-06T15:00:00Z',
          durationDays: 1,
        },
      ],
      total: 21,
      page: 2,
      pageSize: 20,
    });
    const [countQuery, visitsQuery] = query.mock.calls;
    expect(countQuery[0]).toContain(
      "history.transition_kind IN ('stage', 'reopen')",
    );
    expect(countQuery[0]).toContain("'America/Santiago'");
    expect(countQuery[0]).toContain('job."organizationId" = $1');
    expect(countQuery[1]).toEqual([
      'organization-1',
      '2026-01-01',
      '2026-01-31',
      'job-1',
      'stage-1',
    ]);
    expect(visitsQuery[0]).toContain(
      'ORDER BY visit.entered_at DESC, visit.visit_id DESC',
    );
    expect(visitsQuery[0]).toContain('LIMIT $6 OFFSET $7');
    expect(visitsQuery[1]).toEqual([
      'organization-1',
      '2026-01-01',
      '2026-01-31',
      'job-1',
      'stage-1',
      20,
      20,
    ]);
  });
});

describe('OrganizationMetricsService pipeline metrics', () => {
  it('passes the selected week period to the pipeline summary', async () => {
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {
        query: jest.fn().mockResolvedValue([]),
      } as unknown as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      {} as Repository<ApplicationStatusHistoryEntity>,
      {
        getOrganizationById: jest
          .fn()
          .mockResolvedValue({ id: 'organization-id' }),
      } as never,
    );
    jest.spyOn(service, 'getDashboardMetrics').mockResolvedValue({} as never);
    const pipelineMetrics = jest
      .spyOn(service, 'getPipelineMetrics')
      .mockResolvedValue({} as never);
    jest.spyOn(service, 'getTopJobsMetrics').mockResolvedValue([]);
    jest.spyOn(service, 'getRecentTrend').mockResolvedValue([]);
    jest.spyOn(service, 'getGeographicDistribution').mockResolvedValue([]);
    jest.spyOn(service, 'getAvgHiringTimeDays').mockResolvedValue(0);
    jest.spyOn(service, 'getRecruiterProductivity').mockResolvedValue([]);
    jest.spyOn(service, 'getResponseTimeDistribution').mockResolvedValue({
      distribution: {
        lessThan24h: 0,
        oneToThreeDays: 0,
        threeToSevenDays: 0,
        moreThanSevenDays: 0,
      },
      unansweredCount: 0,
    });

    await service.getMetrics('organization-id', { period: 'week' });

    expect(pipelineMetrics).toHaveBeenCalledWith(
      'organization-id',
      undefined,
      undefined,
      'week',
    );
  });

  it('groups source applications and passes the Santiago-local period bounds', async () => {
    const query = jest.fn().mockResolvedValue([
      {
        sourceChannel: 'linkedin',
        sourceMethod: 'self_reported',
        applications: '5',
        reachedInterview: '2',
        hired: '1',
      },
    ]);
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      { query } as unknown as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      {} as Repository<ApplicationStatusHistoryEntity>,
      {} as never,
    );

    await expect(
      service.getSourceAttribution(
        'organization-id',
        'custom',
        '2026-03-01',
        '2026-03-31',
      ),
    ).resolves.toEqual([
      {
        sourceChannel: 'linkedin',
        sourceMethod: 'self_reported',
        applications: 5,
        reachedInterview: 2,
        hired: 1,
      },
    ]);
    expect(query.mock.calls[0]?.[0]).toContain(
      'history.previous_status IS NOT NULL',
    );
    expect(query.mock.calls[0][1]).toEqual([
      'organization-id',
      '2026-03-01',
      '2026-04-01',
    ]);
  });

  it('pages source applications from the same Santiago-local channel cohort', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: '23' }])
      .mockResolvedValueOnce([
        {
          applicationId: 'application-id',
          jobId: 'job-id',
          jobTitle: 'Analista',
          candidateName: 'Postulante',
          status: 'entrevista',
          appliedAt: '2026-03-16T10:00:00.000Z',
        },
      ]);
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      { query } as unknown as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      {} as Repository<ApplicationStatusHistoryEntity>,
      {} as never,
    );

    await expect(
      service.getSourceApplications(
        'organization-id',
        'linkedin',
        'tracked_link',
        'custom',
        '2026-03-01',
        '2026-03-31',
        2,
        20,
      ),
    ).resolves.toEqual({
      rows: [
        {
          applicationId: 'application-id',
          jobId: 'job-id',
          jobTitle: 'Analista',
          candidateName: 'Postulante',
          status: 'entrevista',
          appliedAt: '2026-03-16T10:00:00.000Z',
        },
      ],
      total: 23,
      page: 2,
      pageSize: 20,
    });
    expect(query.mock.calls[0][1]).toEqual([
      'organization-id',
      '2026-03-01',
      '2026-04-01',
      'linkedin',
      'tracked_link',
    ]);
    expect(query.mock.calls[1][1]).toEqual([
      'organization-id',
      '2026-03-01',
      '2026-04-01',
      'linkedin',
      'tracked_link',
      20,
      20,
    ]);
  });
  it('returns completed stage visits for the application cohort', async () => {
    const totalQuery = {
      leftJoin: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      getCount: jest.fn().mockResolvedValue(4),
    };
    const statusQuery = {
      leftJoin: jest.fn(),
      where: jest.fn(),
      andWhere: jest.fn(),
      select: jest.fn(),
      addSelect: jest.fn(),
      groupBy: jest.fn(),
      getRawMany: jest
        .fn()
        .mockResolvedValue([{ status: 'entrevista', count: '2' }]),
    };
    for (const query of [totalQuery, statusQuery]) {
      query.leftJoin.mockReturnValue(query);
      query.where.mockReturnValue(query);
      query.andWhere.mockReturnValue(query);
    }
    statusQuery.select.mockReturnValue(statusQuery);
    statusQuery.addSelect.mockReturnValue(statusQuery);
    statusQuery.groupBy.mockReturnValue(statusQuery);

    const stageRows = [
      {
        jobId: 'job-id',
        jobTitle: 'Lab Scientist',
        stageId: 'stage-id',
        stageName: 'Entrevista técnica',
        averageCompletedDays: '3.25',
        completedVisitCount: 2,
      },
    ];
    const customStageRows = [
      {
        jobId: 'job-id',
        jobTitle: 'Lab Scientist',
        stageId: 'custom-stage-id',
        stageName: 'Revisión técnica',
        enteredApplications: '4',
        advancedApplications: '2',
      },
    ];
    const applicationRepository = {
      createQueryBuilder: jest
        .fn()
        .mockReturnValueOnce(totalQuery)
        .mockReturnValueOnce(statusQuery),
    } as unknown as Repository<ApplicationEntity>;
    const statusHistoryQuery = jest.fn().mockImplementation((sql: string) => {
      if (sql.includes('COUNT(DISTINCT history.application_id)')) {
        return Promise.resolve([
          { entrevista: '3', oferta: '1', contratado: '0' },
        ]);
      }
      if (sql.includes('FROM stage_cohort')) {
        return Promise.resolve(customStageRows);
      }
      return Promise.resolve(stageRows);
    });
    const statusHistoryRepository = {
      query: statusHistoryQuery,
    } as unknown as Repository<ApplicationStatusHistoryEntity>;
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      applicationRepository,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      statusHistoryRepository,
      {} as never,
    );

    await expect(
      service.getPipelineMetrics('organization-id', '2026-01-01', '2026-01-31'),
    ).resolves.toEqual({
      totalApplications: 4,
      reachedCounts: {
        entrevista: 3,
        oferta: 1,
        contratado: 0,
      },
      byStatus: {
        pendiente: 0,
        oferta: 0,
        entrevista: 2,
        rechazado: 0,
        contratado: 0,
      },
      conversionRate: 75,
      customStageConversions: [
        {
          ...customStageRows[0],
          enteredApplications: 4,
          advancedApplications: 2,
          conversionRate: 50,
        },
      ],
      stageDurations: [
        {
          ...stageRows[0],
          averageCompletedDays: 3.3,
          completedVisitCount: 2,
        },
      ],
    });
    expect(statusHistoryQuery.mock.calls[0]?.[0]).toContain(
      'history.previous_status IS NOT NULL',
    );

    expect(statusHistoryQuery).toHaveBeenCalledWith(
      expect.stringContaining('COUNT(DISTINCT history.application_id)'),
      ['organization-id', '2026-01-01', '2026-01-31'],
    );
    expect(statusHistoryQuery).toHaveBeenCalledWith(
      expect.stringContaining('LEAD(history.changed_at) OVER history_order'),
      ['organization-id', '2026-01-01', '2026-01-31'],
    );
    expect(statusHistoryQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        'DISTINCT ON (history.application_id, history.new_stage_id)',
      ),
      ['organization-id', '2026-01-01', '2026-02-01'],
    );
    const customStageQuery = statusHistoryQuery.mock.calls.find(
      ([sql]: [string]) => sql.includes('FROM stage_cohort'),
    )?.[0] as string;
    expect(customStageQuery).toContain("history.transition_kind = 'stage'");
    expect(customStageQuery).toContain('stage.system_key IS NULL');
    expect(customStageQuery).toContain(
      '(exit_history.changed_at, exit_history.id) > (history.changed_at, history.id)',
    );
    expect(customStageQuery).toContain(
      'exit_history.new_stage_id IS DISTINCT FROM history.new_stage_id',
    );
    expect(customStageQuery).toContain(
      "exit_history.new_status NOT IN ('rechazado', 'desistido')",
    );
    expect(customStageQuery).toContain("AT TIME ZONE 'America/Santiago'");
    expect(statusHistoryQuery).toHaveBeenCalledWith(
      expect.stringContaining(
        `(application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago'`,
      ),
      expect.any(Array),
    );
    expect(totalQuery.andWhere).toHaveBeenCalledWith(
      expect.stringContaining(
        `(application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago'`,
      ),
      { customStart: '2026-01-01' },
    );
  });
});

describe('OrganizationMetricsService hiring time', () => {
  const createService = (query: jest.Mock) =>
    new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      { query } as unknown as Repository<ApplicationStatusHistoryEntity>,
      {} as never,
    );

  it('averages the first historical hire for the selected Santiago cohort', async () => {
    const query = jest.fn().mockResolvedValue([{ avgDays: '12.25' }]);
    const service = createService(query);

    await expect(
      service.getAvgHiringTimeDays(
        'organization-id',
        'custom',
        '2026-01-01',
        '2026-01-31',
      ),
    ).resolves.toBe(12.3);

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining("MIN(history.changed_at AT TIME ZONE 'UTC')"),
      ['organization-id', '2026-01-01', '2026-02-01'],
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      "history.new_status = 'contratado'",
    );
    expect(query.mock.calls[0]?.[0]).toContain(
      'history.previous_status IS NOT NULL',
    );
    expect(query.mock.calls[0]?.[0]).toContain('job."organizationId" = $1');
    expect(query.mock.calls[0]?.[0]).toContain("'America/Santiago'");
    expect(query.mock.calls[0]?.[0]).toContain(
      "MIN(history.changed_at AT TIME ZONE 'UTC')",
    );
    expect(query.mock.calls[0]?.[0]).toContain(')::date >= $2::date');
    expect(query.mock.calls[0]?.[0]).toContain(')::date < $3::date');
    expect(query.mock.calls[0]?.[0]).toContain(
      "first_hire.hired_at > (first_hire.created_at AT TIME ZONE 'UTC')",
    );
  });

  it('returns zero when the cohort has no valid historical hires', async () => {
    const query = jest.fn().mockResolvedValue([{ avgDays: null }]);
    const service = createService(query);

    await expect(
      service.getAvgHiringTimeDays(
        'organization-id',
        'custom',
        '2026-01-01',
        '2026-01-31',
      ),
    ).resolves.toBe(0);
  });
});

describe('OrganizationMetricsService custom stage conversions', () => {
  it('returns first-entry applications once with stable pagination', async () => {
    const query = jest
      .fn()
      .mockResolvedValueOnce([{ total: 2 }])
      .mockResolvedValueOnce([
        {
          applicationId: 'application-1',
          applicantName: 'Candidate One',
          stageNameAtEntry: 'Revisión técnica',
          firstEnteredAt: '2026-01-05T15:00:00Z',
          advanced: true,
          currentStatus: 'entrevista',
        },
      ]);
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      { query } as unknown as Repository<ApplicationStatusHistoryEntity>,
      {} as never,
    );

    await expect(
      service.getCustomStageApplications(
        'organization-1',
        'job-1',
        'stage-1',
        '2026-01-01',
        '2026-01-31',
        2,
        20,
      ),
    ).resolves.toEqual({
      rows: [
        {
          applicationId: 'application-1',
          applicantName: 'Candidate One',
          stageNameAtEntry: 'Revisión técnica',
          firstEnteredAt: '2026-01-05T15:00:00Z',
          advanced: true,
          currentStatus: 'entrevista',
        },
      ],
      total: 2,
      page: 2,
      pageSize: 20,
    });

    const [countQuery, pageQuery] = query.mock.calls;
    expect(countQuery[0]).toContain("history.transition_kind = 'stage'");
    expect(countQuery[0]).toContain('job_id = $4 AND stage_id = $5');
    expect(countQuery[1]).toEqual([
      'organization-1',
      '2026-01-01',
      '2026-02-01',
      'job-1',
      'stage-1',
    ]);
    expect(pageQuery[0]).toContain('stage_name_snapshot AS "stageNameAtEntry"');
    expect(pageQuery[0]).toContain(
      'ORDER BY selected_stage.first_entered_at DESC, selected_stage.application_id DESC',
    );
    expect(pageQuery[0]).toContain('LIMIT $6 OFFSET $7');
    expect(pageQuery[1]).toEqual([
      'organization-1',
      '2026-01-01',
      '2026-02-01',
      'job-1',
      'stage-1',
      20,
      20,
    ]);
  });
});

describe('OrganizationMetricsService response metrics', () => {
  afterEach(() => jest.useRealTimers());

  it('uses recruiter stage changes, open current stages, and Santiago cohort dates', async () => {
    const statusHistoryQuery = jest.fn().mockResolvedValue([
      {
        lessThan24h: '1',
        oneToThreeDays: '2',
        threeToSevenDays: '3',
        moreThanSevenDays: '4',
        unansweredCount: '5',
      },
    ]);
    const statusHistoryRepository = {
      query: statusHistoryQuery,
    } as unknown as Repository<ApplicationStatusHistoryEntity>;
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      statusHistoryRepository,
      {} as never,
    );

    await expect(
      service.getResponseTimeDistribution(
        'organization-id',
        'custom',
        '2026-01-01',
        '2026-01-31',
      ),
    ).resolves.toEqual({
      distribution: {
        lessThan24h: 1,
        oneToThreeDays: 2,
        threeToSevenDays: 3,
        moreThanSevenDays: 4,
      },
      unansweredCount: 5,
    });

    const [query, parameters] = statusHistoryQuery.mock.calls[0];
    expect(query).toContain(`(application."createdAt" AT TIME ZONE 'UTC')`);
    expect(query).toContain(`AT TIME ZONE 'America/Santiago')::date`);
    expect(query).toContain("history.transition_kind = 'stage'");
    expect(query).toContain(
      'history.previous_stage_id <> history.new_stage_id',
    );
    expect(query).toContain('history.changed_by_id <> cohort."candidateId"');
    expect(query).toContain("INTERVAL '24 hours'");
    expect(query).toContain("INTERVAL '3 days'");
    expect(query).toContain("INTERVAL '7 days'");
    expect(query).toContain(
      "current_status NOT IN ('contratado', 'rechazado', 'desistido')",
    );
    expect(parameters).toEqual(['organization-id', '2026-01-01', '2026-02-01']);
  });

  it('uses Santiago calendar dates at month boundaries', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-10-01T02:59:59.000Z'));
    const statusHistoryQuery = jest.fn().mockResolvedValue([
      {
        lessThan24h: 0,
        oneToThreeDays: 0,
        threeToSevenDays: 0,
        moreThanSevenDays: 0,
        unansweredCount: 0,
      },
    ]);
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      {
        query: statusHistoryQuery,
      } as unknown as Repository<ApplicationStatusHistoryEntity>,
      {} as never,
    );

    await service.getResponseTimeDistribution('organization-id', 'month');

    expect(statusHistoryQuery.mock.calls[0]?.[1]).toEqual([
      'organization-id',
      '2026-09-01',
      '2026-10-01',
    ]);
  });

  it('returns a paginated response bucket from the same first-response rules', async () => {
    const statusHistoryQuery = jest
      .fn()
      .mockResolvedValueOnce([{ total: '21' }])
      .mockResolvedValueOnce([
        {
          applicationId: 'application-1',
          jobId: 'job-1',
          applicantName: 'Candidate',
          jobTitle: 'Scientist',
          submittedAt: '2026-01-05T10:00:00Z',
          respondedAt: '2026-01-06T10:00:00Z',
          responseDays: '1',
          currentStatus: 'entrevista',
        },
      ]);
    const service = new OrganizationMetricsService(
      {} as Repository<JobEntity>,
      {} as Repository<ApplicationEntity>,
      {} as Repository<EventEntity>,
      {} as Repository<OrganizationMemberEntity>,
      {
        query: statusHistoryQuery,
      } as unknown as Repository<ApplicationStatusHistoryEntity>,
      {} as never,
    );

    await expect(
      service.getResponseTimeVisits(
        'organization-id',
        'oneToThreeDays',
        'custom',
        '2026-01-01',
        '2026-01-31',
        2,
        10,
      ),
    ).resolves.toMatchObject({
      rows: [{ applicationId: 'application-1', responseDays: 1 }],
      total: 21,
      page: 2,
      pageSize: 10,
    });

    expect(statusHistoryQuery).toHaveBeenCalledTimes(2);
    expect(statusHistoryQuery.mock.calls[0]?.[0]).toContain(
      'history.changed_by_id <> cohort."candidateId"',
    );
    expect(statusHistoryQuery.mock.calls[0]?.[0]).toContain(
      "duration >= INTERVAL '24 hours' AND duration < INTERVAL '3 days'",
    );
    expect(statusHistoryQuery.mock.calls[0]?.[1]).toEqual([
      'organization-id',
      '2026-01-01',
      '2026-02-01',
      'oneToThreeDays',
    ]);
    expect(statusHistoryQuery.mock.calls[1]?.[1]).toEqual([
      'organization-id',
      '2026-01-01',
      '2026-02-01',
      'oneToThreeDays',
      10,
      10,
    ]);
  });
});

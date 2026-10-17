import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import {
  UserEntity,
  WaitlistEntity,
  ApplicationEntity,
  JobEntity,
  OrganizationEntity,
  UserType,
  JobStatus,
} from '../../infrastructure/database/orm';

export interface AdminStats {
  users: {
    total: number;
    professionals: number;
    organizations: number;
    active: number;
    inactive: number;
    recentCount: number;
    recentTrend: number;
  };
  waitlist: {
    total: number;
    professionals: number;
    organizations: number;
  };
  platform: {
    activeJobs: number;
    totalApplications: number;
    totalOrganizations: number;
  };
}

export type SystemBroadcastResult =
  | { status: 'queued'; broadcastId: string; queued: number }
  | { status: 'replayed'; broadcastId: string; queued: number }
  | { status: 'organization_missing' }
  | { status: 'request_id_conflict' };

export interface RegistrationDataPoint {
  date: string;
  professionals: number;
  organizations: number;
}

export interface RegistrationsTrendResponse {
  data: RegistrationDataPoint[];
  totals: {
    professionals: number;
    organizations: number;
  };
}

export interface TopJob {
  jobId: string;
  title: string;
  organizationName: string;
  applications: number;
  views: number;
  applicationRate: number;
}

export interface TopJobsResponse {
  data: TopJob[];
}

export interface ApplicationTrendPoint {
  date: string;
  count: number;
}

export interface ApplicationsTrendResponse {
  data: ApplicationTrendPoint[];
  total: number;
}

export interface AdminHealthDetailed {
  status: 'ok' | 'degraded';
  timestamp: string;
  latencyMs: number;
  checks: {
    database: {
      status: 'up' | 'down';
      message?: string;
      error?: string;
    };
  };
}

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    @InjectRepository(WaitlistEntity)
    private readonly waitlistRepo: Repository<WaitlistEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepo: Repository<ApplicationEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepo: Repository<JobEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepo: Repository<OrganizationEntity>,
    private readonly dataSource: DataSource,
  ) {}

  async getAdminStats(): Promise<AdminStats> {
    const [userStats, waitlistStats, platformStats, previous7DaysCount] =
      await Promise.all([
        this.getUserStats(),
        this.getWaitlistStats(),
        this.getPlatformStats(),
        this.getRecentUsersCount(7, 14), // count for 7-14 days ago
      ]);

    const recent7DaysCount = userStats.recent;
    const recentTrend =
      previous7DaysCount > 0
        ? Math.min(
            Math.max(
              Math.round(
                ((recent7DaysCount - previous7DaysCount) / previous7DaysCount) *
                  100,
              ),
              -100,
            ),
            100,
          )
        : recent7DaysCount > 0
          ? 100
          : 0;

    return {
      users: {
        total: userStats.professionals + userStats.organizations,
        professionals: userStats.professionals,
        organizations: userStats.organizations,
        active: userStats.active,
        inactive: userStats.inactive,
        recentCount: recent7DaysCount,
        recentTrend,
      },
      waitlist: {
        total: waitlistStats.total,
        professionals: waitlistStats.professionals,
        organizations: waitlistStats.organizations,
      },
      platform: {
        activeJobs: platformStats.activeJobs,
        totalApplications: platformStats.totalApplications,
        totalOrganizations: platformStats.totalOrganizations,
      },
    };
  }

  async getRegistrationsTrend(
    days: 30 | 90 = 30,
  ): Promise<RegistrationsTrendResponse> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const rows = await this.userRepo
      .createQueryBuilder('u')
      .select(
        "TO_CHAR(u.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
        'date',
      )
      .addSelect(
        'SUM(CASE WHEN u.type = :professional THEN 1 ELSE 0 END)',
        'professionals',
      )
      .addSelect(
        'SUM(CASE WHEN u.type = :organization THEN 1 ELSE 0 END)',
        'organizations',
      )
      .where(
        "TO_CHAR(u.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startDate",
        { startDate: startDateStr },
      )
      .setParameters({
        professional: UserType.PROFESSIONAL,
        organization: UserType.ORGANIZATION,
      })
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{
        date: string;
        professionals: string;
        organizations: string;
      }>();

    const registrationByDate = new Map<
      string,
      { professionals: number; organizations: number }
    >();
    for (const row of rows) {
      registrationByDate.set(row.date, {
        professionals: parseInt(row.professionals, 10),
        organizations: parseInt(row.organizations, 10),
      });
    }

    const data: RegistrationDataPoint[] = [];
    const current = new Date(startDate);
    while (current <= now) {
      const dateStr = current.toISOString().split('T')[0];
      const found = registrationByDate.get(dateStr);
      data.push({
        date: dateStr,
        professionals: found?.professionals ?? 0,
        organizations: found?.organizations ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }

    const totals = data.reduce(
      (acc, d) => ({
        professionals: acc.professionals + d.professionals,
        organizations: acc.organizations + d.organizations,
      }),
      { professionals: 0, organizations: 0 },
    );

    return { data, totals };
  }

  async getTopJobs(limit: number = 10): Promise<TopJobsResponse> {
    const countRows = await this.applicationRepo
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .select('app.jobId', 'jobId')
      .addSelect('COUNT(*)', 'count')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .groupBy('app.jobId')
      .getRawMany<{ jobId: string; count: string }>();

    const countMap = new Map(
      countRows.map(r => [r.jobId, parseInt(r.count, 10)]),
    );

    const jobs = await this.jobRepo
      .createQueryBuilder('job')
      .leftJoinAndSelect('job.organization', 'organization')
      .where('job.status = :status', { status: JobStatus.ACTIVE })
      .orderBy('job.views', 'DESC')
      .limit(limit)
      .getMany();

    const topJobs: TopJob[] = jobs.map(job => {
      const applicationsCount = countMap.get(job.id) ?? 0;
      return {
        jobId: job.id,
        title: job.title,
        organizationName: job.organization?.name ?? '',
        applications: applicationsCount,
        views: job.views,
        applicationRate:
          job.views > 0 ? Math.round((applicationsCount / job.views) * 100) : 0,
      };
    });

    return { data: topJobs };
  }

  async getApplicationsTrend(
    days: 30 | 90 = 30,
  ): Promise<ApplicationsTrendResponse> {
    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const rows = await this.applicationRepo
      .createQueryBuilder('a')
      .select(
        "TO_CHAR(a.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
        'date',
      )
      .addSelect('COUNT(*)', 'count')
      .where(
        "TO_CHAR(a.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startDate",
        { startDate: startDateStr },
      )
      .groupBy('date')
      .orderBy('date', 'ASC')
      .getRawMany<{ date: string; count: string }>();

    const countByDate = new Map<string, number>();
    for (const row of rows) {
      countByDate.set(row.date, parseInt(row.count, 10));
    }

    const data: ApplicationTrendPoint[] = [];
    const current = new Date(startDate);
    while (current <= now) {
      const dateStr = current.toISOString().split('T')[0];
      data.push({
        date: dateStr,
        count: countByDate.get(dateStr) ?? 0,
      });
      current.setDate(current.getDate() + 1);
    }

    const total = rows.reduce((sum, row) => sum + parseInt(row.count, 10), 0);

    return { data, total };
  }

  async getAdminHealthDetailed(): Promise<AdminHealthDetailed> {
    const start = Date.now();

    let dbStatus: 'up' | 'down';
    let dbMessage: string;
    let dbError: string | undefined;

    try {
      await this.dataSource.query('SELECT 1');
      dbStatus = 'up';
      dbMessage = 'Database connection is healthy';
    } catch {
      dbStatus = 'down';
      dbMessage = 'Database connection failed';
      dbError = 'Database connection failed';
    }

    const latencyMs = Date.now() - start;
    const isHealthy = dbStatus === 'up';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      latencyMs,
      checks: {
        database: {
          status: dbStatus,
          message: dbMessage,
          error: dbError,
        },
      },
    };
  }

  private async getUserStats() {
    const row = await this.userRepo
      .createQueryBuilder('u')
      .select('COUNT(*)', 'total')
      .addSelect(
        'SUM(CASE WHEN u.type = :professional THEN 1 ELSE 0 END)',
        'professionals',
      )
      .addSelect(
        'SUM(CASE WHEN u.type = :organization THEN 1 ELSE 0 END)',
        'organizations',
      )
      .addSelect('SUM(CASE WHEN u.isActive = true THEN 1 ELSE 0 END)', 'active')
      .addSelect(
        'SUM(CASE WHEN u.isActive = false THEN 1 ELSE 0 END)',
        'inactive',
      )
      .addSelect(
        "SUM(CASE WHEN u.createdAt >= NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END)",
        'recent',
      )
      .setParameters({
        professional: UserType.PROFESSIONAL,
        organization: UserType.ORGANIZATION,
      })
      .getRawOne<{
        total: string;
        professionals: string;
        organizations: string;
        active: string;
        inactive: string;
        recent: string;
      }>();

    return {
      total: parseInt(row?.total ?? '0', 10),
      professionals: parseInt(row?.professionals ?? '0', 10),
      organizations: parseInt(row?.organizations ?? '0', 10),
      active: parseInt(row?.active ?? '0', 10),
      inactive: parseInt(row?.inactive ?? '0', 10),
      recent: parseInt(row?.recent ?? '0', 10),
    };
  }

  private async getWaitlistStats() {
    const row = await this.waitlistRepo
      .createQueryBuilder('w')
      .select('COUNT(*)', 'total')
      .addSelect(
        "SUM(CASE WHEN w.role = 'professional' THEN 1 ELSE 0 END)",
        'professionals',
      )
      .addSelect(
        "SUM(CASE WHEN w.role = 'organization' THEN 1 ELSE 0 END)",
        'organizations',
      )
      .getRawOne<{
        total: string;
        professionals: string;
        organizations: string;
      }>();

    return {
      total: parseInt(row?.total ?? '0', 10),
      professionals: parseInt(row?.professionals ?? '0', 10),
      organizations: parseInt(row?.organizations ?? '0', 10),
    };
  }

  private async getPlatformStats() {
    const [activeJobs, totalApplications, totalOrganizations] =
      await Promise.all([
        this.jobRepo.count({ where: { status: JobStatus.ACTIVE } }),
        this.applicationRepo.count(),
        this.organizationRepo.count(),
      ]);

    return { activeJobs, totalApplications, totalOrganizations };
  }

  async broadcastSystemNotification(
    organizationId: string,
    title: string,
    body: string,
    actorUserId: string,
    requestId: string,
  ): Promise<SystemBroadcastResult> {
    return this.dataSource.transaction(async manager => {
      const existing = await manager.query<
        Array<{
          id: string;
          organizationId: string;
          title: string;
          body: string;
        }>
      >(
        `SELECT id, organization_id AS "organizationId", title, body
         FROM system_notification_broadcast
         WHERE actor_user_id = $1::uuid AND request_id = $2::uuid
         FOR UPDATE`,
        [actorUserId, requestId],
      );
      const prior = existing[0];
      if (prior) {
        if (
          prior.organizationId !== organizationId ||
          prior.title !== title ||
          prior.body !== body
        ) {
          return { status: 'request_id_conflict' } as const;
        }
        const counts = await manager.query<Array<{ count: number }>>(
          `SELECT count(*)::int AS count
           FROM system_notification_broadcast_intent
           WHERE broadcast_id = $1::uuid`,
          [prior.id],
        );
        return {
          status: 'replayed',
          broadcastId: prior.id,
          queued: Number(counts[0]?.count ?? 0),
        } as const;
      }

      const organizations = await manager.query<Array<{ id: string }>>(
        'SELECT id FROM organization WHERE id = $1::uuid',
        [organizationId],
      );
      if (organizations.length === 0) {
        return { status: 'organization_missing' } as const;
      }

      const inserted = await manager.query<Array<{ id: string }>>(
        `INSERT INTO system_notification_broadcast
          (organization_id, actor_user_id, request_id, title, body)
         VALUES ($1::uuid, $2::uuid, $3::uuid, $4, $5)
         ON CONFLICT (actor_user_id, request_id) DO NOTHING
         RETURNING id`,
        [organizationId, actorUserId, requestId, title, body],
      );
      if (inserted.length === 0) {
        const concurrent = await manager.query<
          Array<{
            id: string;
            organizationId: string;
            title: string;
            body: string;
          }>
        >(
          `SELECT id, organization_id AS "organizationId", title, body
           FROM system_notification_broadcast
           WHERE actor_user_id = $1::uuid AND request_id = $2::uuid
           FOR UPDATE`,
          [actorUserId, requestId],
        );
        const committed = concurrent[0];
        if (
          !committed ||
          committed.organizationId !== organizationId ||
          committed.title !== title ||
          committed.body !== body
        ) {
          return { status: 'request_id_conflict' } as const;
        }
        const counts = await manager.query<Array<{ count: number }>>(
          `SELECT count(*)::int AS count
           FROM system_notification_broadcast_intent
           WHERE broadcast_id = $1::uuid`,
          [committed.id],
        );
        return {
          status: 'replayed',
          broadcastId: committed.id,
          queued: Number(counts[0]?.count ?? 0),
        } as const;
      }

      const intents = await manager.query<Array<{ id: string }>>(
        `INSERT INTO system_notification_broadcast_intent
          (broadcast_id, recipient_id)
         SELECT $1::uuid, recipients.user_id
         FROM (
           SELECT account.id AS user_id
           FROM "user" account
           WHERE account."organizationId" = $2::uuid AND account."isActive" IS TRUE
           UNION
           SELECT member.user_id
           FROM organization_member member
           JOIN "user" account ON account.id = member.user_id
           WHERE member.organization_id = $2::uuid AND account."isActive" IS TRUE
         ) recipients
         ON CONFLICT (broadcast_id, recipient_id) DO NOTHING
         RETURNING id`,
        [inserted[0].id, organizationId],
      );
      return {
        status: 'queued',
        broadcastId: inserted[0].id,
        queued: intents.length,
      } as const;
    });
  }

  private async getRecentUsersCount(
    daysAgo: number,
    daysAgoStart: number,
  ): Promise<number> {
    const now = new Date();
    const startOld = new Date(now);
    startOld.setDate(startOld.getDate() - daysAgoStart);
    const startOldStr = startOld.toISOString().split('T')[0];

    const endRecent = new Date(now);
    endRecent.setDate(endRecent.getDate() - daysAgo);
    const endRecentStr = endRecent.toISOString().split('T')[0];

    const result = await this.userRepo
      .createQueryBuilder('u')
      .select('COUNT(*)', 'count')
      .where(
        "TO_CHAR(u.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startOld",
        { startOld: startOldStr },
      )
      .andWhere(
        "TO_CHAR(u.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') < :endRecent",
        { endRecent: endRecentStr },
      )
      .getRawOne<{ count: string }>();

    return parseInt(result?.count ?? '0', 10);
  }
}

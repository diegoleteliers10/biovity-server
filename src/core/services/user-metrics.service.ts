import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApplicationEntity,
  ApplicationStatus,
  EventEntity,
  JobEntity,
  OrganizationEntity,
  UserEntity,
} from '../../infrastructure/database/orm';
import { UserService } from './user.service';

type MetricsPeriod = 'week' | 'month' | 'year';

const SANTIAGO_TZ = 'America/Santiago';
const REACHED_STATUSES = [
  ApplicationStatus.ENTREVISTA,
  ApplicationStatus.OFERTA,
  ApplicationStatus.CONTRATADO,
];

export interface QuickMetrics {
  totalApplications: number;
  activeApplications: number;
  responseRate: number;
}

export interface UserKPIs {
  applicationsLast30Days: number;
  interviews: number;
  offers: number;
  avgResponseTimeDays: number | null;
  profileViews: number;
}

export interface TrendDataPoint {
  date: string;
  applications: number;
}

export interface ApplicationBucket {
  lessThan24h: number;
  oneToThreeDays: number;
  threeToSevenDays: number;
  moreThanSevenDays: number;
}

export interface FunnelStage {
  count: number;
  percentage: number;
}

export interface HiringFunnel {
  aplicado: FunnelStage;
  entrevista: FunnelStage;
  oferta: FunnelStage;
  contratado: FunnelStage;
}

export interface CategoryDistribution {
  category: string;
  count: number;
  percentage: number;
}

export interface UserMetrics {
  quickMetrics: QuickMetrics;
  kpis: UserKPIs;
  applicationsTrend: TrendDataPoint[];
  responseTimeDistribution: ApplicationBucket;
  hiringFunnel: HiringFunnel;
  categoriesApplied: CategoryDistribution[];
}

interface TrendBucket {
  labelDate: string;
  days: string[];
}

@Injectable()
export class UserMetricsService {
  constructor(
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(OrganizationEntity)
    private readonly organizationRepository: Repository<OrganizationEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly userService: UserService,
  ) {}

  async getMetrics(
    userId: string,
    period: MetricsPeriod = 'month',
  ): Promise<UserMetrics> {
    const user = await this.userService.getUserById(userId);
    if (!user) {
      throw new NotFoundException(`User with id ${userId} not found`);
    }

    const [
      quickMetrics,
      kpis,
      applicationsTrend,
      responseTimeDistribution,
      hiringFunnel,
      categoriesApplied,
    ] = await Promise.all([
      this.getQuickMetrics(userId),
      this.getKPIs(userId),
      this.getApplicationsTrend(userId, period),
      this.getResponseTimeDistribution(userId),
      this.getHiringFunnel(userId),
      this.getCategoriesApplied(userId),
    ]);

    return {
      quickMetrics,
      kpis,
      applicationsTrend,
      responseTimeDistribution,
      hiringFunnel,
      categoriesApplied,
    };
  }

  async getQuickMetrics(userId: string): Promise<QuickMetrics> {
    const totalApplications = await this.applicationRepository.count({
      where: { candidateId: userId },
    });

    const activeApplications = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.status IN (:...statuses)', {
        statuses: [
          ApplicationStatus.PENDIENTE,
          ApplicationStatus.ENTREVISTA,
          ApplicationStatus.OFERTA,
        ],
      })
      .getCount();

    const reachedCount = await this.countDistinctReached(
      userId,
      REACHED_STATUSES,
    );
    const responseRate =
      totalApplications > 0
        ? Math.round((reachedCount / totalApplications) * 100)
        : 0;

    return {
      totalApplications,
      activeApplications,
      responseRate,
    };
  }

  async getKPIs(userId: string): Promise<UserKPIs> {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];

    const applicationsLast30Days = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :thirtyDaysAgo",
        { thirtyDaysAgo: thirtyDaysAgoStr },
      )
      .getCount();

    const interviews = await this.countDistinctReached(userId, [
      ApplicationStatus.ENTREVISTA,
    ]);
    const offers = await this.countDistinctReached(userId, [
      ApplicationStatus.OFERTA,
    ]);

    const avgResponseTimeDays = await this.calculateAvgResponseTime(userId);
    const profileViews = await this.getProfileViews(userId);

    return {
      applicationsLast30Days,
      interviews,
      offers,
      avgResponseTimeDays,
      profileViews,
    };
  }

  private async countDistinctReached(
    userId: string,
    statuses: ApplicationStatus[],
  ): Promise<number> {
    const rows = await this.applicationRepository.query(
      `SELECT COUNT(DISTINCT h.application_id)::int AS n
         FROM application_status_history h
         JOIN application a ON a.id = h.application_id
        WHERE a."candidateId" = $1 AND h.new_status = ANY($2::text[])`,
      [userId, statuses],
    );
    return Number(rows?.[0]?.n ?? 0);
  }

  private async calculateAvgResponseTime(
    userId: string,
  ): Promise<number | null> {
    const result = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.stageChangedAt > application.createdAt')
      .andWhere('application.status != :pendingStatus', {
        pendingStatus: ApplicationStatus.PENDIENTE,
      })
      .select(
        'AVG(EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400)',
        'avg_days',
      )
      .getRawOne<{ avg_days: string | null }>();

    if (!result?.avg_days) {
      return null;
    }
    return Math.round(parseFloat(result.avg_days) * 10) / 10;
  }

  async getProfileViews(userId: string): Promise<number> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      select: ['profileViews'],
    });
    return user?.profileViews ?? 0;
  }

  async getApplicationsTrend(
    userId: string,
    period: MetricsPeriod,
  ): Promise<TrendDataPoint[]> {
    const buckets = await this.buildTrendBuckets(userId, period);
    if (buckets.length === 0) {
      return [];
    }

    const rangeStart = buckets[0].days[0];
    const rows = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :rangeStart",
        { rangeStart },
      )
      .select(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
        'day',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
      )
      .getRawMany<{ day: string; count: string }>();

    const dayMap = new Map(rows.map(row => [row.day, parseInt(row.count, 10)]));

    return buckets.map(bucket => ({
      date: bucket.labelDate,
      applications: bucket.days.reduce(
        (sum, day) => sum + (dayMap.get(day) ?? 0),
        0,
      ),
    }));
  }

  private async buildTrendBuckets(
    userId: string,
    period: MetricsPeriod,
  ): Promise<TrendBucket[]> {
    const now = this.santiagoNow();

    if (period === 'week') {
      return this.buildWeekBuckets(now, 12);
    }
    if (period === 'month') {
      return this.buildMonthBuckets(now, 12);
    }
    return this.buildYearBuckets(userId, now);
  }

  private buildWeekBuckets(now: Date, count: number): TrendBucket[] {
    const dayOfWeek = now.getUTCDay();
    const mondayOffset = (dayOfWeek + 6) % 7;
    const currentMonday = Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - mondayOffset,
    );
    const firstMonday = currentMonday - (count - 1) * 7 * 86_400_000;

    const buckets: TrendBucket[] = [];
    for (let i = 0; i < count; i++) {
      const start = firstMonday + i * 7 * 86_400_000;
      const days: string[] = [];
      for (let d = 0; d < 7; d++) {
        days.push(this.toDateStr(new Date(start + d * 86_400_000)));
      }
      buckets.push({ labelDate: this.toDateStr(new Date(start)), days });
    }
    return buckets;
  }

  private buildMonthBuckets(now: Date, count: number): TrendBucket[] {
    const buckets: TrendBucket[] = [];
    for (let i = count - 1; i >= 0; i--) {
      const monthStart = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1),
      );
      const monthEnd = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i + 1, 1),
      );
      const days: string[] = [];
      const cursor = new Date(monthStart);
      while (cursor < monthEnd) {
        days.push(this.toDateStr(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      buckets.push({ labelDate: this.toDateStr(monthStart), days });
    }
    return buckets;
  }

  private async buildYearBuckets(
    userId: string,
    now: Date,
  ): Promise<TrendBucket[]> {
    const minRow = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .select(
        `EXTRACT(YEAR FROM (application.createdAt AT TIME ZONE '${SANTIAGO_TZ}'))::int`,
        'min_year',
      )
      .orderBy('min_year', 'ASC')
      .limit(1)
      .getRawOne<{ min_year: number | null }>();

    const currentYear = now.getUTCFullYear();
    const minYear = minRow?.min_year ?? currentYear;

    const buckets: TrendBucket[] = [];
    for (let year = minYear; year <= currentYear; year++) {
      const days: string[] = [];
      const cursor = new Date(Date.UTC(year, 0, 1));
      const yearEnd = new Date(Date.UTC(year + 1, 0, 1));
      while (cursor < yearEnd) {
        days.push(this.toDateStr(cursor));
        cursor.setUTCDate(cursor.getUTCDate() + 1);
      }
      buckets.push({
        labelDate: this.toDateStr(new Date(Date.UTC(year, 0, 1))),
        days,
      });
    }
    return buckets;
  }

  private santiagoNow(): Date {
    const utcNow = new Date();
    const shifted = new Date(
      utcNow.toLocaleString('en-US', { timeZone: SANTIAGO_TZ }),
    );
    return new Date(
      Date.UTC(
        shifted.getFullYear(),
        shifted.getMonth(),
        shifted.getDate(),
        shifted.getHours(),
        shifted.getMinutes(),
        shifted.getSeconds(),
      ),
    );
  }

  private toDateStr(d: Date): string {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  async getResponseTimeDistribution(
    userId: string,
  ): Promise<ApplicationBucket> {
    const result = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.stageChangedAt > application.createdAt')
      .andWhere('application.status != :pendingStatus', {
        pendingStatus: ApplicationStatus.PENDIENTE,
      })
      .select(
        `SUM(CASE WHEN EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400 < 1 THEN 1 ELSE 0 END)`,
        'less_than_24h',
      )
      .addSelect(
        `SUM(CASE WHEN EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400 >= 1 AND EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400 <= 3 THEN 1 ELSE 0 END)`,
        'one_to_three_days',
      )
      .addSelect(
        `SUM(CASE WHEN EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400 > 3 AND EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400 <= 7 THEN 1 ELSE 0 END)`,
        'three_to_seven_days',
      )
      .addSelect(
        `SUM(CASE WHEN EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400 > 7 THEN 1 ELSE 0 END)`,
        'more_than_seven_days',
      )
      .getRawOne<{
        less_than_24h: string;
        one_to_three_days: string;
        three_to_seven_days: string;
        more_than_seven_days: string;
      }>();

    return {
      lessThan24h: parseInt(result?.less_than_24h ?? '0', 10),
      oneToThreeDays: parseInt(result?.one_to_three_days ?? '0', 10),
      threeToSevenDays: parseInt(result?.three_to_seven_days ?? '0', 10),
      moreThanSevenDays: parseInt(result?.more_than_seven_days ?? '0', 10),
    };
  }

  async getHiringFunnel(userId: string): Promise<HiringFunnel> {
    const statusCounts = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .select('application.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('application.status')
      .getRawMany();

    const counts = {
      [ApplicationStatus.PENDIENTE]: 0,
      [ApplicationStatus.ENTREVISTA]: 0,
      [ApplicationStatus.OFERTA]: 0,
      [ApplicationStatus.RECHAZADO]: 0,
      [ApplicationStatus.CONTRATADO]: 0,
      [ApplicationStatus.DESISTIDO]: 0,
    };

    statusCounts.forEach((row: { status: string; count: string }) => {
      if (row.status in counts) {
        counts[row.status as keyof typeof counts] = parseInt(row.count, 10);
      }
    });

    const total = Object.values(counts).reduce((sum, c) => sum + c, 0);

    const toPercent = (count: number) => ({
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0,
    });

    return {
      aplicado: toPercent(total),
      entrevista: toPercent(counts[ApplicationStatus.ENTREVISTA]),
      oferta: toPercent(counts[ApplicationStatus.OFERTA]),
      contratado: toPercent(counts[ApplicationStatus.CONTRATADO]),
    };
  }

  async getCategoriesApplied(userId: string): Promise<CategoryDistribution[]> {
    const results = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .where('application.candidateId = :userId', { userId })
      .select("COALESCE(job.category, 'Other')", 'category')
      .addSelect('COUNT(*)', 'count')
      .groupBy("COALESCE(job.category, 'Other')")
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany<{ category: string; count: string }>();

    const total = results.reduce(
      (sum, row) => sum + parseInt(row.count, 10),
      0,
    );

    return results.map(row => ({
      category: row.category || 'Other',
      count: parseInt(row.count, 10),
      percentage:
        total > 0 ? Math.round((parseInt(row.count, 10) / total) * 100) : 0,
    }));
  }
}

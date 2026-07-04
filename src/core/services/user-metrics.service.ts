import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  ApplicationEntity,
  ApplicationStatus,
  EventEntity,
  EventType,
  EventStatus,
  JobEntity,
  OrganizationEntity,
  UserEntity,
} from '../../infrastructure/database/orm';
import { UserService } from './user.service';

export interface QuickMetrics {
  totalApplications: number;
  activeApplications: number;
  responseRate: number;
}

export interface UserKPIs {
  applicationsLast30Days: number;
  responseRate: number;
  interviews: number;
  offers: number;
  avgResponseTimeDays: number;
  profileViews: number;
}

export interface TrendDataPoint {
  month: string;
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

export interface IndustryDistribution {
  industry: string;
  count: number;
  percentage: number;
}

export interface UpcomingInterview {
  eventId: string;
  title: string;
  startAt: string;
  jobId: string;
  jobTitle: string;
  organizationId: string;
  organizationName: string;
}

export interface RecentApplication {
  applicationId: string;
  jobTitle: string;
  organizationName: string;
  status: ApplicationStatus;
  appliedAt: string;
}

export interface UserMetrics {
  quickMetrics: QuickMetrics;
  kpis: UserKPIs;
  applicationsTrend: TrendDataPoint[];
  responseTimeDistribution: ApplicationBucket;
  hiringFunnel: HiringFunnel;
  industriesApplied: IndustryDistribution[];
  upcomingInterviews: UpcomingInterview[];
  recentApplications: RecentApplication[];
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
    period: 'week' | 'month' | 'year' = 'month',
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
      industriesApplied,
      upcomingInterviews,
      recentApplications,
    ] = await Promise.all([
      this.getQuickMetrics(userId),
      this.getKPIs(userId),
      this.getApplicationsTrend(userId, period),
      this.getResponseTimeDistribution(userId),
      this.getHiringFunnel(userId),
      this.getIndustriesApplied(userId),
      this.getUpcomingInterviews(userId),
      this.getRecentApplications(userId),
    ]);

    return {
      quickMetrics,
      kpis,
      applicationsTrend,
      responseTimeDistribution,
      hiringFunnel,
      industriesApplied,
      upcomingInterviews,
      recentApplications,
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

    const nonPendingCount = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.status != :pendingStatus', {
        pendingStatus: ApplicationStatus.PENDIENTE,
      })
      .getCount();

    const responseRate =
      totalApplications > 0
        ? Math.round((nonPendingCount / totalApplications) * 100)
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

    const totalApplications = await this.applicationRepository.count({
      where: { candidateId: userId },
    });

    const advancedCount = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.status != :pendingStatus', {
        pendingStatus: ApplicationStatus.PENDIENTE,
      })
      .getCount();

    const responseRate =
      totalApplications > 0
        ? Math.round((advancedCount / totalApplications) * 100)
        : 0;

    const interviews = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.status = :status', {
        status: ApplicationStatus.ENTREVISTA,
      })
      .getCount();

    const offers = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere('application.status = :status', {
        status: ApplicationStatus.OFERTA,
      })
      .getCount();

    const avgResponseTimeDays = await this.calculateAvgResponseTime(userId);

    const profileViews = await this.getProfileViews(userId);

    return {
      applicationsLast30Days,
      responseRate,
      interviews,
      offers,
      avgResponseTimeDays,
      profileViews,
    };
  }

  private async calculateAvgResponseTime(userId: string): Promise<number> {
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

    const avgDays = result?.avg_days ? parseFloat(result.avg_days) : 0;
    return Math.round(avgDays * 10) / 10;
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
    period: 'week' | 'month' | 'year',
  ): Promise<TrendDataPoint[]> {
    const now = new Date();
    let startDate: Date;

    if (period === 'week') {
      startDate = new Date(now);
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    } else {
      startDate = new Date(now.getFullYear(), 0, 1);
    }
    const startDateStr = startDate.toISOString().split('T')[0];

    const applicationsByMonth = await this.applicationRepository
      .createQueryBuilder('application')
      .where('application.candidateId = :userId', { userId })
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startDate",
        { startDate: startDateStr },
      )
      .select(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM')",
        'month',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM')",
      )
      .orderBy('month', 'ASC')
      .getRawMany();

    interface MonthRow {
      month: string;
      count: string;
    }

    const resultsMap = new Map(
      (applicationsByMonth as MonthRow[]).map(row => [
        row.month,
        parseInt(row.count, 10),
      ]),
    );

    const result: TrendDataPoint[] = [];
    const current = new Date(startDate);
    while (current <= now) {
      const monthStr = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, '0')}`;
      result.push({
        month: monthStr,
        applications: resultsMap.get(monthStr) ?? 0,
      });
      current.setMonth(current.getMonth() + 1);
    }

    return result;
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

  async getIndustriesApplied(userId: string): Promise<IndustryDistribution[]> {
    const results = await this.applicationRepository
      .createQueryBuilder('application')
      .innerJoin('application.job', 'job')
      .where('application.candidateId = :userId', { userId })
      .select('COALESCE(job."employmentType"::text, \'Other\')', 'industry')
      .addSelect('COUNT(*)', 'count')
      .groupBy('COALESCE(job."employmentType"::text, \'Other\')')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    interface IndustryRow {
      industry: string;
      count: string;
    }

    const resultsTyped = results as IndustryRow[];
    const total = resultsTyped.reduce(
      (sum, row) => sum + parseInt(row.count, 10),
      0,
    );

    return resultsTyped.map(row => ({
      industry: row.industry || 'Other',
      count: parseInt(row.count, 10),
      percentage:
        total > 0 ? Math.round((parseInt(row.count, 10) / total) * 100) : 0,
    }));
  }

  async getUpcomingInterviews(userId: string): Promise<UpcomingInterview[]> {
    const now = new Date();
    const nowStr = now.toISOString();

    const events = await this.eventRepository
      .createQueryBuilder('event')
      .leftJoin('event.application', 'application')
      .leftJoin('application.job', 'job')
      .leftJoin('job.organization', 'org')
      .where('event.candidateId = :userId', { userId })
      .andWhere('event.type = :type', { type: EventType.INTERVIEW })
      .andWhere('event.status = :status', { status: EventStatus.SCHEDULED })
      .andWhere('event.startAt > :now', { now: nowStr })
      .orderBy('event.startAt', 'ASC')
      .limit(5)
      .getMany();

    return events.map(event => ({
      eventId: event.id,
      title: event.title,
      startAt: event.startAt.toISOString(),
      jobId: event.application?.jobId || '',
      jobTitle: event.application?.job?.title || '',
      organizationId: event.application?.job?.organizationId || '',
      organizationName: event.application?.job?.organization?.name || '',
    }));
  }

  async getRecentApplications(userId: string): Promise<RecentApplication[]> {
    const applications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .leftJoin('job.organization', 'org')
      .where('application.candidateId = :userId', { userId })
      .orderBy('application.createdAt', 'DESC')
      .limit(10)
      .getMany();

    return applications.map(app => ({
      applicationId: app.id,
      jobTitle: app.job?.title || '',
      organizationName: app.job?.organization
        ? app.job.organization?.name || ''
        : '',
      status: app.status,
      appliedAt: app.createdAt.toISOString(),
    }));
  }
}

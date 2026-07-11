import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JobEntity,
  ApplicationEntity,
  EventEntity,
  OrganizationMemberEntity,
} from '../../infrastructure/database/orm';
import { EventStatus, EventType, JobStatus, ApplicationStatus } from '../domain/enums';
import { OrganizationService } from './organization.service';

export interface DashboardMetrics {
  activeJobs: number;
  pendingApplications: number;
  interviewsThisPeriod: number;
  interviewsTrend: number; // percentage change vs last period
  applicationsTrend: number; // percentage change vs last period
}

export interface PipelineMetrics {
  totalApplications: number;
  byStatus: {
    pendiente: number;
    oferta: number;
    entrevista: number;
    rechazado: number;
    contratado: number;
  };
  conversionRate: number; // entrevistas / total * 100
  avgTimeInStages: {
    entrevista: number;
    oferta: number;
    contratado: number;
  };
}

export interface JobPerformanceMetrics {
  jobId: string;
  jobTitle: string;
  views: number;
  applications: number;
  applicationRate: number; // applications / views * 100
}

export interface GeographicDistribution {
  city: string;
  count: number;
  percentage: number;
}

export interface RecruiterProductivity {
  userId: string;
  userName: string;
  userEmail: string;
  applicationsProcessed: number;
  interviewsConducted: number;
  avgResponseTimeDays: number;
}

export interface OrganizationMetrics {
  dashboard: DashboardMetrics;
  pipeline: PipelineMetrics;
  topJobs: JobPerformanceMetrics[];
  recentTrend: {
    date: string;
    applications: number;
    interviews: number;
  }[];
  geographicDistribution: GeographicDistribution[];
  avgHiringTimeDays: number;
  recruiterProductivity: RecruiterProductivity[];
}

export interface OrganizationMetricsFilters {
  period?: 'week' | 'month' | 'year' | 'custom';
  startDate?: string;
  endDate?: string;
}

@Injectable()
export class OrganizationMetricsService {
  constructor(
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly applicationRepository: Repository<ApplicationEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepository: Repository<OrganizationMemberEntity>,
    private readonly organizationService: OrganizationService,
  ) {}

  async getMetrics(
    organizationId: string,
    filters?: OrganizationMetricsFilters,
  ): Promise<OrganizationMetrics> {
    // Verify organization exists
    const organization =
      await this.organizationService.getOrganizationById(organizationId);
    if (!organization) {
      throw new NotFoundException(
        `Organization with id ${organizationId} not found`,
      );
    }

    const period = filters?.period || 'month';
    const startDate = filters?.startDate;
    const endDate = filters?.endDate;

    const [
      dashboard,
      pipeline,
      topJobs,
      recentTrend,
      geographicDistribution,
      avgHiringTimeDays,
      recruiterProductivity,
    ] = await Promise.all([
      this.getDashboardMetrics(organizationId, period, startDate, endDate),
      this.getPipelineMetrics(organizationId, startDate, endDate),
      this.getTopJobsMetrics(organizationId),
      this.getRecentTrend(organizationId, period, startDate, endDate),
      this.getGeographicDistribution(organizationId),
      this.getAvgHiringTimeDays(organizationId),
      this.getRecruiterProductivity(organizationId, startDate, endDate),
    ]);

    return {
      dashboard,
      pipeline,
      topJobs,
      recentTrend,
      geographicDistribution,
      avgHiringTimeDays,
      recruiterProductivity,
    };
  }

  async getDashboardMetrics(
    organizationId: string,
    period: string,
    customStart?: string,
    customEnd?: string,
  ): Promise<DashboardMetrics> {
    const now = new Date();
    const { startOfPeriod, endOfPeriod, startOfLastPeriod } =
      this.getPeriodDates(now, period, customStart, customEnd);

    // Active jobs count
    const activeJobs = await this.jobRepository.count({
      where: {
        organizationId,
        status: JobStatus.ACTIVE,
      },
    });

    // Pending applications (for org's jobs)
    const pendingApplications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('application.status = :status', { status: 'pendiente' })
      .getCount();

    // Interviews this period - using date string comparison to avoid timezone issues
    const interviewsThisPeriod = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.type = :type', { type: EventType.INTERVIEW })
      .andWhere('event.status = :status', { status: EventStatus.SCHEDULED })
      .andWhere(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startOfPeriod",
        { startOfPeriod },
      )
      .andWhere(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') < :endOfPeriod",
        { endOfPeriod },
      )
      .getCount();

    // Count interviews from last period for trend calculation
    const interviewsLastPeriod = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.type = :type', { type: EventType.INTERVIEW })
      .andWhere('event.status = :status', { status: EventStatus.SCHEDULED })
      .andWhere(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startOfLastPeriod",
        { startOfLastPeriod },
      )
      .andWhere(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') < :startOfPeriod",
        { startOfPeriod },
      )
      .getCount();

    // Applications this period vs last period
    const applicationsThisPeriod = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startOfPeriod",
        { startOfPeriod },
      )
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') < :endOfPeriod",
        { endOfPeriod },
      )
      .getCount();

    const applicationsLastPeriod = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startOfLastPeriod",
        { startOfLastPeriod },
      )
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') < :startOfPeriod",
        { startOfPeriod },
      )
      .getCount();

    // Calculate trends
    const interviewsTrend =
      interviewsLastPeriod > 0
        ? Math.round(
            ((interviewsThisPeriod - interviewsLastPeriod) /
              interviewsLastPeriod) *
              100,
          )
        : interviewsThisPeriod > 0
          ? 100
          : 0;

    const applicationsTrend =
      applicationsLastPeriod > 0
        ? Math.round(
            ((applicationsThisPeriod - applicationsLastPeriod) /
              applicationsLastPeriod) *
              100,
          )
        : applicationsThisPeriod > 0
          ? 100
          : 0;

    return {
      activeJobs,
      pendingApplications,
      interviewsThisPeriod: interviewsThisPeriod,
      interviewsTrend,
      applicationsTrend,
    };
  }

  async getPipelineMetrics(
    organizationId: string,
    customStart?: string,
    customEnd?: string,
  ): Promise<PipelineMetrics> {
    // Total applications
    let queryTotal = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId });

    // By status
    let queryStatus = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .select('application.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('application.status');

    // Avg days spent to reach each stage
    let queryAvgDays = this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere("application.status != 'pendiente'")
      .select('application.status', 'status')
      .addSelect('AVG(EXTRACT(EPOCH FROM (application.stageChangedAt - application.createdAt)) / 86400)', 'avgDays')
      .groupBy('application.status');

    if (customStart) {
      queryTotal = queryTotal.andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :customStart",
        { customStart },
      );
      queryStatus = queryStatus.andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :customStart",
        { customStart },
      );
      queryAvgDays = queryAvgDays.andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :customStart",
        { customStart },
      );
    }
    if (customEnd) {
      queryTotal = queryTotal.andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') <= :customEnd",
        { customEnd },
      );
      queryStatus = queryStatus.andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') <= :customEnd",
        { customEnd },
      );
      queryAvgDays = queryAvgDays.andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') <= :customEnd",
        { customEnd },
      );
    }

    const [totalApplications, statusCounts, avgDaysRaw] = await Promise.all([
      queryTotal.getCount(),
      queryStatus.getRawMany(),
      queryAvgDays.getRawMany(),
    ]);

    const byStatus = {
      pendiente: 0,
      oferta: 0,
      entrevista: 0,
      rechazado: 0,
      contratado: 0,
    };

    statusCounts.forEach((row: { status: string; count: string }) => {
      if (row.status in byStatus) {
        byStatus[row.status as keyof typeof byStatus] = parseInt(row.count, 10);
      }
    });

    // Conversion rate: entrevistas / total * 100
    const conversionRate =
      totalApplications > 0
        ? Math.round((byStatus.entrevista / totalApplications) * 100)
        : 0;

    const avgTimeInStages = {
      entrevista: 0,
      oferta: 0,
      contratado: 0,
    };

    avgDaysRaw.forEach((row: { status: string; avgDays: string }) => {
      const status = row.status;
      if (status in avgTimeInStages) {
        avgTimeInStages[status as keyof typeof avgTimeInStages] =
          Math.round((parseFloat(row.avgDays) || 0) * 10) / 10;
      }
    });

    return {
      totalApplications,
      byStatus,
      conversionRate,
      avgTimeInStages,
    };
  }

  async getTopJobsMetrics(
    organizationId: string,
    limit: number = 5,
  ): Promise<JobPerformanceMetrics[]> {
    const countRows = await this.applicationRepository
      .createQueryBuilder('app')
      .innerJoin('app.job', 'job')
      .select('app.jobId', 'jobId')
      .addSelect('COUNT(*)', 'count')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('job.status = :status', { status: JobStatus.ACTIVE })
      .groupBy('app.jobId')
      .getRawMany<{ jobId: string; count: string }>();

    const countMap = new Map(
      countRows.map(r => [r.jobId, parseInt(r.count, 10)]),
    );

    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('job.status = :status', { status: JobStatus.ACTIVE })
      .orderBy('job.views', 'DESC')
      .limit(limit)
      .getMany();

    return jobs.map(job => {
      const applicationsCount = countMap.get(job.id) ?? 0;
      return {
        jobId: job.id,
        jobTitle: job.title,
        views: job.views,
        applications: applicationsCount,
        applicationRate:
          job.views > 0 ? Math.round((applicationsCount / job.views) * 100) : 0,
      };
    });
  }

  async getRecentTrend(
    organizationId: string,
    period: string,
    customStart?: string,
    customEnd?: string,
  ): Promise<{ date: string; applications: number; interviews: number }[]> {
    let startDateObj: Date;
    let endDateObj: Date = new Date();

    if (period === 'custom' && customStart && customEnd) {
      startDateObj = new Date(customStart);
      endDateObj = new Date(customEnd);
    } else {
      const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
      startDateObj = new Date();
      startDateObj.setDate(startDateObj.getDate() - days);
    }

    const startDateStr = startDateObj.toISOString().split('T')[0];
    const endDateStr = endDateObj.toISOString().split('T')[0];

    const applicationsByDate = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startDateStr",
        { startDateStr },
      )
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') <= :endDateStr",
        { endDateStr },
      )
      .select(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
        'date',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
      )
      .orderBy('date', 'ASC')
      .getRawMany();

    const interviewsByDate = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :organizationId', { organizationId })
      .andWhere('event.type = :type', { type: EventType.INTERVIEW })
      .andWhere(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startDateStr",
        { startDateStr },
      )
      .andWhere(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') <= :endDateStr",
        { endDateStr },
      )
      .select(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
        'date',
      )
      .addSelect('COUNT(*)', 'count')
      .groupBy(
        "TO_CHAR(event.startAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD')",
      )
      .orderBy('date', 'ASC')
      .getRawMany();

    // Create a map for quick lookup
    const appsMap = new Map(
      applicationsByDate.map((row: { date: string; count: string }) => [
        row.date,
        parseInt(row.count, 10),
      ]),
    );
    const interviewsMap = new Map(
      interviewsByDate.map((row: { date: string; count: string }) => [
        row.date,
        parseInt(row.count, 10),
      ]),
    );

    // Generate all dates in range
    const result: { date: string; applications: number; interviews: number }[] =
      [];
    const current = new Date(startDateObj);
    while (current <= endDateObj) {
      const dateStr = current.toISOString().split('T')[0];
      result.push({
        date: dateStr,
        applications: appsMap.get(dateStr) || 0,
        interviews: interviewsMap.get(dateStr) || 0,
      });
      current.setDate(current.getDate() + 1);
    }

    return result;
  }

  async getGeographicDistribution(
    organizationId: string,
  ): Promise<GeographicDistribution[]> {
    const results = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.candidate', 'candidate')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .select("COALESCE(candidate.location->>'city', 'Unknown')", 'city')
      .addSelect('COUNT(*)', 'count')
      .groupBy("COALESCE(candidate.location->>'city', 'Unknown')")
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    const total = results.reduce(
      (sum: number, row: { count: string }) => sum + parseInt(row.count, 10),
      0,
    );

    return results.map((row: { city: string; count: string }) => ({
      city: row.city || 'Unknown',
      count: parseInt(row.count, 10),
      percentage:
        total > 0 ? Math.round((parseInt(row.count, 10) / total) * 100) : 0,
    }));
  }

  async getAvgHiringTimeDays(organizationId: string): Promise<number> {
    const result = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('application.status = :status', { status: 'contratado' })
      .andWhere('application.stageChangedAt > application.createdAt')
      .select(
        'AVG(EXTRACT(EPOCH FROM (application."stageChangedAt" - application."createdAt")) / 86400)',
        'avg_days',
      )
      .getRawOne<{ avg_days: string | null }>();

    const avgDays = result?.avg_days ? parseFloat(result.avg_days) : 0;
    return Math.round(avgDays * 10) / 10;
  }

  async getRecruiterProductivity(
    organizationId: string,
    customStart?: string,
    customEnd?: string,
  ): Promise<RecruiterProductivity[]> {
    const members = await this.memberRepository.find({
      where: { organizationId },
      relations: ['user'],
    });

    if (members.length === 0) return [];

    const results = await Promise.all(
      members.map(async (member) => {
        const userId = member.userId;

        let appQuery = this.applicationRepository
          .createQueryBuilder('app')
          .leftJoin('app.job', 'job')
          .where('job.organizationId = :orgId', { orgId: organizationId });

        let interviewQuery = this.eventRepository
          .createQueryBuilder('event')
          .where('event.organizationId = :orgId', { orgId: organizationId })
          .andWhere('event.type = :type', { type: EventType.INTERVIEW });

        if (customStart) {
          appQuery = appQuery.andWhere('app.createdAt >= :customStart', { customStart });
          interviewQuery = interviewQuery.andWhere('event.createdAt >= :customStart', { customStart });
        }
        if (customEnd) {
          appQuery = appQuery.andWhere('app.createdAt <= :customEnd', { customEnd });
          interviewQuery = interviewQuery.andWhere('event.createdAt <= :customEnd', { customEnd });
        }

        const [appsProcessed, interviews, avgDaysRaw] = await Promise.all([
          appQuery.andWhere('app.status != :status', { status: ApplicationStatus.PENDIENTE }).getCount(),
          interviewQuery.getCount(),
          this.applicationRepository
            .createQueryBuilder('app')
            .leftJoin('app.job', 'job')
            .where('job.organizationId = :orgId', { orgId: organizationId })
            .andWhere('app.stageChangedAt > app.createdAt')
            .andWhere('app.status != :pending', { pending: ApplicationStatus.PENDIENTE })
            .select(
              'AVG(EXTRACT(EPOCH FROM (app."stageChangedAt" - app."createdAt")) / 86400)',
              'avgDays',
            )
            .getRawOne<{ avgDays: string | null }>(),
        ]);

        const avgDays = avgDaysRaw?.avgDays ? parseFloat(avgDaysRaw.avgDays) : 0;

        return {
          userId,
          userName: member.user?.name ?? 'Unknown',
          userEmail: member.user?.email ?? '',
          applicationsProcessed: appsProcessed,
          interviewsConducted: interviews,
          avgResponseTimeDays: Math.round(avgDays * 10) / 10,
        };
      }),
    );

    return results;
  }

  private getPeriodDates(
    date: Date,
    period: string,
    customStart?: string,
    customEnd?: string,
  ): { startOfPeriod: string; endOfPeriod: string; startOfLastPeriod: string } {
    if (period === 'custom' && customStart && customEnd) {
      const startOfPeriod = new Date(customStart);
      const endOfPeriod = new Date(customEnd);
      const durationMs = endOfPeriod.getTime() - startOfPeriod.getTime();
      const startOfLastPeriod = new Date(startOfPeriod.getTime() - durationMs);

      return {
        startOfPeriod: startOfPeriod.toISOString().split('T')[0],
        endOfPeriod: endOfPeriod.toISOString().split('T')[0],
        startOfLastPeriod: startOfLastPeriod.toISOString().split('T')[0],
      };
    }

    const now = new Date(date);

    let startOfPeriod: Date;
    let endOfPeriod: Date;
    let startOfLastPeriod: Date;

    if (period === 'week') {
      // Current week starting Monday
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1);
      startOfPeriod = new Date(now);
      startOfPeriod.setDate(diff);
      startOfPeriod.setHours(0, 0, 0, 0);

      // End of current week (next Monday)
      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setDate(startOfPeriod.getDate() + 7);

      // Last week
      startOfLastPeriod = new Date(startOfPeriod);
      startOfLastPeriod.setDate(startOfPeriod.getDate() - 7);
    } else if (period === 'month') {
      // First day of current month
      startOfPeriod = new Date(now.getFullYear(), now.getMonth(), 1);

      // First day of next month (for upper bound)
      endOfPeriod = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      // First day of last month
      startOfLastPeriod = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    } else {
      // First day of current year
      startOfPeriod = new Date(now.getFullYear(), 0, 1);

      // First day of next year
      endOfPeriod = new Date(now.getFullYear() + 1, 0, 1);

      // First day of last year
      startOfLastPeriod = new Date(now.getFullYear() - 1, 0, 1);
    }

    // Format as YYYY-MM-DD
    const startOfPeriodStr = startOfPeriod.toISOString().split('T')[0];
    const endOfPeriodStr = endOfPeriod.toISOString().split('T')[0];
    const startOfLastPeriodStr = startOfLastPeriod.toISOString().split('T')[0];

    return {
      startOfPeriod: startOfPeriodStr,
      endOfPeriod: endOfPeriodStr,
      startOfLastPeriod: startOfLastPeriodStr,
    };
  }
}

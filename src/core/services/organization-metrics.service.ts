import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JobEntity,
  ApplicationEntity,
  EventEntity,
  EventStatus,
  EventType,
} from '../../infrastructure/database/orm';
import { JobStatus } from '../domain/entities/job.entity';
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
}

export interface JobPerformanceMetrics {
  jobId: string;
  jobTitle: string;
  views: number;
  applications: number;
  applicationRate: number; // applications / views * 100
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
}

export interface OrganizationMetricsFilters {
  period?: 'week' | 'month' | 'year';
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

    const [dashboard, pipeline, topJobs, recentTrend] = await Promise.all([
      this.getDashboardMetrics(organizationId, period),
      this.getPipelineMetrics(organizationId),
      this.getTopJobsMetrics(organizationId),
      this.getRecentTrend(organizationId, period),
    ]);

    return {
      dashboard,
      pipeline,
      topJobs,
      recentTrend,
    };
  }

  async getDashboardMetrics(
    organizationId: string,
    period: string,
  ): Promise<DashboardMetrics> {
    const now = new Date();
    const { startOfPeriod, endOfPeriod, startOfLastPeriod } =
      this.getPeriodDates(now, period);

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

  async getPipelineMetrics(organizationId: string): Promise<PipelineMetrics> {
    // Total applications
    const totalApplications = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .getCount();

    // By status
    const statusCounts = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .select('application.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('application.status')
      .getRawMany();

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

    return {
      totalApplications,
      byStatus,
      conversionRate,
    };
  }

  async getTopJobsMetrics(
    organizationId: string,
    limit: number = 5,
  ): Promise<JobPerformanceMetrics[]> {
    const jobs = await this.jobRepository
      .createQueryBuilder('job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('job.status = :status', { status: JobStatus.ACTIVE })
      .orderBy('job.views', 'DESC')
      .limit(limit)
      .getMany();

    const topJobs: JobPerformanceMetrics[] = [];

    for (const job of jobs) {
      const applicationsCount = await this.applicationRepository.count({
        where: { jobId: job.id },
      });

      topJobs.push({
        jobId: job.id,
        jobTitle: job.title,
        views: job.views,
        applications: applicationsCount,
        applicationRate:
          job.views > 0 ? Math.round((applicationsCount / job.views) * 100) : 0,
      });
    }

    return topJobs;
  }

  async getRecentTrend(
    organizationId: string,
    period: string,
  ): Promise<{ date: string; applications: number; interviews: number }[]> {
    const now = new Date();
    const days = period === 'week' ? 7 : period === 'month' ? 30 : 365;
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - days);
    const startDateStr = startDate.toISOString().split('T')[0];

    const applicationsByDate = await this.applicationRepository
      .createQueryBuilder('application')
      .leftJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere(
        "TO_CHAR(application.createdAt AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :startDateStr",
        { startDateStr },
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
    const current = new Date(startDate);
    while (current <= now) {
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

  private getPeriodDates(
    date: Date,
    period: string,
  ): { startOfPeriod: string; endOfPeriod: string; startOfLastPeriod: string } {
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

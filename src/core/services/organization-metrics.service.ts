import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  JobEntity,
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
  EventEntity,
  OrganizationMemberEntity,
} from '../../infrastructure/database/orm';
import {
  EventStatus,
  EventType,
  JobStatus,
  ApplicationStatus,
} from '../domain/enums';
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
  reachedCounts: {
    entrevista: number;
    oferta: number;
    contratado: number;
  };
  byStatus: {
    pendiente: number;
    oferta: number;
    entrevista: number;
    rechazado: number;
    contratado: number;
  };
  conversionRate: number; // entrevistas / total * 100
  customStageConversions: {
    jobId: string;
    jobTitle: string;
    stageId: string;
    stageName: string;
    enteredApplications: number;
    advancedApplications: number;
    conversionRate: number;
  }[];
  stageDurations: {
    jobId: string;
    jobTitle: string;
    stageId: string;
    stageName: string;
    averageCompletedDays: number;
    completedVisitCount: number;
  }[];
}

export interface StageDurationVisitPage {
  rows: {
    visitId: string;
    applicationId: string;
    applicantName: string;
    enteredAt: string;
    exitedAt: string;
    durationDays: number;
  }[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CustomStageApplicationPage {
  rows: {
    applicationId: string;
    applicantName: string;
    stageNameAtEntry: string | null;
    firstEnteredAt: string;
    advanced: boolean;
    currentStatus: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
}

export type ResponseTimeBucket =
  | 'lessThan24h'
  | 'oneToThreeDays'
  | 'threeToSevenDays'
  | 'moreThanSevenDays'
  | 'unanswered';

export interface ResponseTimeVisitPage {
  rows: {
    applicationId: string;
    jobId: string;
    applicantName: string;
    jobTitle: string;
    submittedAt: string;
    respondedAt: string | null;
    responseDays: number | null;
    currentStatus: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
}

const COMPLETED_STAGE_VISITS_CTE = `WITH application_cohort AS (
  SELECT application.id, application."jobId" AS job_id, job.title AS job_title
  FROM application
  INNER JOIN job ON job.id = application."jobId"
  WHERE job."organizationId" = $1
    AND ($2::date IS NULL OR ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date)
    AND ($3::date IS NULL OR ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date <= $3::date)
), ordered_history AS (
  SELECT history.application_id, history.id, history.changed_at,
    history.previous_status, history.new_stage_id, history.new_stage_name,
    history.transition_kind,
    LEAD(history.changed_at) OVER history_order AS next_changed_at,
    LEAD(history.previous_stage_id) OVER history_order AS next_previous_stage_id,
    LEAD(history.previous_stage_name) OVER history_order AS next_previous_stage_name
  FROM application_status_history history
  INNER JOIN application_cohort cohort ON cohort.id = history.application_id
  WINDOW history_order AS (
    PARTITION BY history.application_id ORDER BY history.changed_at, history.id
  )
), completed_visits AS (
  SELECT history.id AS visit_id, history.application_id,
    cohort.job_id, cohort.job_title, history.changed_at AS entered_at,
    history.next_changed_at AS exited_at,
    COALESCE(history.new_stage_id,
      CASE WHEN history.previous_status IS NULL THEN history.next_previous_stage_id END
    ) AS stage_id,
    COALESCE(history.new_stage_name,
      CASE WHEN history.previous_status IS NULL THEN history.next_previous_stage_name END,
      stage.name
    ) AS stage_name,
    EXTRACT(EPOCH FROM (history.next_changed_at - history.changed_at)) / 86400.0 AS duration_days
  FROM ordered_history history
  INNER JOIN application_cohort cohort ON cohort.id = history.application_id
  LEFT JOIN pipeline_stage stage ON stage.id = COALESCE(history.new_stage_id,
    CASE WHEN history.previous_status IS NULL THEN history.next_previous_stage_id END
  )
  WHERE history.next_changed_at IS NOT NULL
    AND history.transition_kind IN ('stage', 'reopen')
    AND COALESCE(history.new_stage_id,
      CASE WHEN history.previous_status IS NULL THEN history.next_previous_stage_id END
    ) IS NOT NULL
)`;

const CUSTOM_STAGE_ENTRIES_CTE = `WITH first_entries AS (
  SELECT DISTINCT ON (history.application_id, history.new_stage_id)
    history.application_id,
    history.id AS first_entry_id,
    job.id AS job_id,
    job.title AS job_title,
    stage.id AS stage_id,
    stage.name AS stage_name,
    history.new_stage_name AS stage_name_snapshot,
    history.changed_at AS first_entered_at,
    application.status AS current_status,
    EXISTS (
      SELECT 1
      FROM application_status_history exit_history
      WHERE exit_history.application_id = history.application_id
        AND exit_history.previous_stage_id = history.new_stage_id
        AND exit_history.transition_kind = 'stage'
        AND (exit_history.changed_at, exit_history.id) > (history.changed_at, history.id)
        AND exit_history.new_stage_id IS DISTINCT FROM history.new_stage_id
        AND exit_history.new_status NOT IN ('rechazado', 'desistido')
    ) AS advanced
  FROM application_status_history history
  INNER JOIN application ON application.id = history.application_id
  INNER JOIN job ON job.id = application."jobId"
  INNER JOIN pipeline_stage stage ON stage.id = history.new_stage_id
  WHERE job."organizationId" = $1
    AND stage.system_key IS NULL
    AND history.transition_kind = 'stage'
  ORDER BY history.application_id, history.new_stage_id, history.changed_at, history.id
), stage_cohort AS (
  SELECT first_entries.*
  FROM first_entries
  WHERE ($2::date IS NULL OR ((first_entries.first_entered_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date)
    AND ($3::date IS NULL OR ((first_entries.first_entered_at AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < $3::date)
)`;

const RESPONSE_TIME_CTE = `WITH application_cohort AS (
  SELECT application.id, application."candidateId", application."createdAt",
    application."jobId" AS job_id, job.title AS job_title,
    COALESCE(stage.status_projection, application.status::text) AS current_status
  FROM application
  INNER JOIN job ON job.id = application."jobId"
  LEFT JOIN pipeline_stage stage
    ON stage.id = application.pipeline_stage_id
    AND stage.job_id = application."jobId"
  WHERE job."organizationId" = $1
    AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date
    AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < $3::date
), ranked_responses AS (
  SELECT history.application_id, history.changed_at,
    ROW_NUMBER() OVER (
      PARTITION BY history.application_id
      ORDER BY history.changed_at, history.id
    ) AS response_rank
  FROM application_status_history history
  INNER JOIN application_cohort cohort ON cohort.id = history.application_id
  WHERE history.transition_kind = 'stage'
    AND history.previous_stage_id IS NOT NULL
    AND history.new_stage_id IS NOT NULL
    AND history.previous_stage_id <> history.new_stage_id
    AND history.changed_by_id IS NOT NULL
    AND history.changed_by_id <> cohort."candidateId"
    AND history.changed_at >= cohort."createdAt"
), first_responses AS (
  SELECT application_id, changed_at
  FROM ranked_responses
  WHERE response_rank = 1
), response_durations AS (
  SELECT cohort.id, cohort."candidateId", cohort."createdAt", cohort.job_id,
    cohort.job_title,
    cohort.current_status, response.changed_at AS responded_at,
    response.changed_at - cohort."createdAt" AS duration
  FROM application_cohort cohort
  LEFT JOIN first_responses response ON response.application_id = cohort.id
)`;

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

export interface ResponseTimeDistribution {
  lessThan24h: number;
  oneToThreeDays: number;
  threeToSevenDays: number;
  moreThanSevenDays: number;
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
  responseTimeDistribution: ResponseTimeDistribution;
  unansweredCount: number;
  sourceAttribution: ApplicationSourceAttribution[];
}

export interface ApplicationSourceAttribution {
  sourceChannel: string;
  sourceMethod: string;
  applications: number;
  reachedInterview: number;
  hired: number;
}

export interface SourceApplication {
  applicationId: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  status: string;
  appliedAt: string;
}

export interface SourceApplicationsPage {
  rows: SourceApplication[];
  total: number;
  page: number;
  pageSize: number;
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
    @InjectRepository(ApplicationStatusHistoryEntity)
    private readonly statusHistoryRepository: Repository<ApplicationStatusHistoryEntity>,
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
      responseTime,
      sourceAttribution,
    ] = await Promise.all([
      this.getDashboardMetrics(organizationId, period, startDate, endDate),
      this.getPipelineMetrics(organizationId, startDate, endDate, period),
      this.getTopJobsMetrics(organizationId),
      this.getRecentTrend(organizationId, period, startDate, endDate),
      this.getGeographicDistribution(organizationId),
      this.getAvgHiringTimeDays(organizationId, period, startDate, endDate),
      this.getRecruiterProductivity(organizationId, startDate, endDate),
      this.getResponseTimeDistribution(
        organizationId,
        period,
        startDate,
        endDate,
      ),
      this.getSourceAttribution(organizationId, period, startDate, endDate),
    ]);

    return {
      dashboard,
      pipeline,
      topJobs,
      recentTrend,
      geographicDistribution,
      avgHiringTimeDays,
      recruiterProductivity,
      responseTimeDistribution: responseTime.distribution,
      unansweredCount: responseTime.unansweredCount,
      sourceAttribution,
    };
  }

  async getSourceAttribution(
    organizationId: string,
    period: string,
    customStart?: string,
    customEnd?: string,
  ): Promise<ApplicationSourceAttribution[]> {
    const { startOfPeriod, endOfPeriod } = this.getPeriodDates(
      new Date(),
      period,
      customStart,
      customEnd,
    );
    const rows: ApplicationSourceAttribution[] =
      await this.applicationRepository.query(
        `SELECT application.source_channel AS "sourceChannel",
          application.source_method AS "sourceMethod",
          COUNT(DISTINCT application.id)::int AS applications,
          COUNT(DISTINCT application.id) FILTER (
            WHERE history.new_status IN ('entrevista', 'oferta', 'contratado')
          )::int AS "reachedInterview",
          COUNT(DISTINCT application.id) FILTER (
            WHERE history.new_status = 'contratado'
          )::int AS hired
        FROM application
        INNER JOIN job ON job.id = application."jobId"
        LEFT JOIN application_status_history history
          ON history.application_id = application.id
         AND history.transition_kind = 'stage'
         AND history.previous_status IS NOT NULL
        WHERE job."organizationId" = $1
          AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date
          AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < $3::date
        GROUP BY application.source_channel, application.source_method
        ORDER BY applications DESC, application.source_channel, application.source_method`,
        [organizationId, startOfPeriod, endOfPeriod],
      );
    return rows.map(row => ({
      ...row,
      applications: Number(row.applications),
      reachedInterview: Number(row.reachedInterview),
      hired: Number(row.hired),
    }));
  }

  async getSourceApplications(
    organizationId: string,
    sourceChannel: string,
    sourceMethod: string,
    period: string,
    customStart: string | undefined,
    customEnd: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<SourceApplicationsPage> {
    const range = this.getPeriodDates(
      new Date(),
      period,
      customStart,
      customEnd,
    );
    const params = [
      organizationId,
      range.startOfPeriod,
      range.endOfPeriod,
      sourceChannel,
      sourceMethod,
    ];
    const [countRows, rows] = await Promise.all([
      this.applicationRepository.query<Array<{ total: number }>>(
        `SELECT COUNT(*)::int AS total
         FROM application
         INNER JOIN job ON job.id = application."jobId"
         WHERE job."organizationId" = $1
           AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date
           AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < $3::date
           AND application.source_channel = $4
           AND application.source_method = $5`,
        params,
      ),
      this.applicationRepository.query<SourceApplication[]>(
        `SELECT application.id AS "applicationId",
                job.id AS "jobId",
                job.title AS "jobTitle",
                candidate.name AS "candidateName",
                application.status AS status,
                application."createdAt" AS "appliedAt"
         FROM application
         INNER JOIN job ON job.id = application."jobId"
         INNER JOIN "user" AS candidate ON candidate.id = application."candidateId"
         WHERE job."organizationId" = $1
           AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date
           AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < $3::date
           AND application.source_channel = $4
           AND application.source_method = $5
         ORDER BY application."createdAt" DESC, application.id DESC
         LIMIT $6 OFFSET $7`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
    ]);
    return {
      rows,
      total: Number(countRows[0]?.total ?? 0),
      page,
      pageSize,
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
    period = customStart && customEnd ? 'custom' : 'month',
  ): Promise<PipelineMetrics> {
    const stageDateRange = this.getPeriodDates(
      new Date(),
      period,
      customStart,
      customEnd,
    );
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

    if (customStart) {
      queryTotal = queryTotal.andWhere(
        "TO_CHAR((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :customStart",
        { customStart },
      );
      queryStatus = queryStatus.andWhere(
        "TO_CHAR((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') >= :customStart",
        { customStart },
      );
    }
    if (customEnd) {
      queryTotal = queryTotal.andWhere(
        "TO_CHAR((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') <= :customEnd",
        { customEnd },
      );
      queryStatus = queryStatus.andWhere(
        "TO_CHAR((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago', 'YYYY-MM-DD') <= :customEnd",
        { customEnd },
      );
    }

    const [
      totalApplications,
      statusCounts,
      reachedCountsRaw,
      stageDurationsRaw,
      customStageConversionsRaw,
    ] = await Promise.all([
      queryTotal.getCount(),
      queryStatus.getRawMany(),
      this.statusHistoryRepository.query<
        {
          entrevista: number | string;
          oferta: number | string;
          contratado: number | string;
        }[]
      >(
        `SELECT
            COUNT(DISTINCT history.application_id) FILTER (
              WHERE history.new_status IN ('entrevista', 'oferta', 'contratado')
            )::int AS entrevista,
            COUNT(DISTINCT history.application_id) FILTER (
              WHERE history.new_status IN ('oferta', 'contratado')
            )::int AS oferta,
            COUNT(DISTINCT history.application_id) FILTER (
              WHERE history.new_status = 'contratado'
            )::int AS contratado
          FROM application_status_history history
          INNER JOIN application ON application.id = history.application_id
          INNER JOIN job ON job.id = application."jobId"
          WHERE job."organizationId" = $1
            AND ($2::date IS NULL OR ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date)
            AND ($3::date IS NULL OR ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date <= $3::date)
            AND history.transition_kind = 'stage'
            AND history.previous_status IS NOT NULL`,
        [organizationId, customStart ?? null, customEnd ?? null],
      ),
      this.statusHistoryRepository.query<
        {
          jobId: string;
          jobTitle: string;
          stageId: string;
          stageName: string | null;
          averageCompletedDays: number | string;
          completedVisitCount: number | string;
        }[]
      >(
        `${COMPLETED_STAGE_VISITS_CTE}
        SELECT job_id AS "jobId", job_title AS "jobTitle", stage_id AS "stageId",
          (ARRAY_AGG(stage_name ORDER BY entered_at DESC))[1] AS "stageName",
          AVG(duration_days)::double precision AS "averageCompletedDays",
          COUNT(*)::int AS "completedVisitCount"
        FROM completed_visits
        GROUP BY job_id, job_title, stage_id
        ORDER BY job_title, "stageName", stage_id`,
        [organizationId, customStart ?? null, customEnd ?? null],
      ),
      this.statusHistoryRepository.query<
        {
          jobId: string;
          jobTitle: string;
          stageId: string;
          stageName: string;
          enteredApplications: number | string;
          advancedApplications: number | string;
        }[]
      >(
        `${CUSTOM_STAGE_ENTRIES_CTE}
        SELECT job_id AS "jobId", job_title AS "jobTitle", stage_id AS "stageId",
          stage_name AS "stageName",
          COUNT(*)::int AS "enteredApplications",
          COUNT(*) FILTER (WHERE advanced)::int AS "advancedApplications"
        FROM stage_cohort
        GROUP BY job_id, job_title, stage_id, stage_name
        ORDER BY job_title, stage_name, stage_id`,
        [
          organizationId,
          stageDateRange.startOfPeriod,
          stageDateRange.endOfPeriod,
        ],
      ),
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

    const reachedCounts = {
      entrevista: Number(reachedCountsRaw[0]?.entrevista ?? 0),
      oferta: Number(reachedCountsRaw[0]?.oferta ?? 0),
      contratado: Number(reachedCountsRaw[0]?.contratado ?? 0),
    };

    // Conversion rate: applications that reached an interview / total * 100
    const conversionRate =
      totalApplications > 0
        ? Math.round((reachedCounts.entrevista / totalApplications) * 100)
        : 0;

    const stageDurations = stageDurationsRaw.map(
      (row: {
        jobId: string;
        jobTitle: string;
        stageId: string;
        stageName: string | null;
        averageCompletedDays: number | string;
        completedVisitCount: number | string;
      }) => ({
        jobId: row.jobId,
        jobTitle: row.jobTitle,
        stageId: row.stageId,
        stageName: row.stageName ?? 'Etapa sin nombre',
        averageCompletedDays:
          Math.round(Number(row.averageCompletedDays) * 10) / 10,
        completedVisitCount: Number(row.completedVisitCount),
      }),
    );
    const customStageConversions = customStageConversionsRaw.map(row => {
      const enteredApplications = Number(row.enteredApplications);
      const advancedApplications = Number(row.advancedApplications);
      return {
        ...row,
        enteredApplications,
        advancedApplications,
        conversionRate:
          enteredApplications > 0
            ? Math.round((advancedApplications / enteredApplications) * 100)
            : 0,
      };
    });

    return {
      totalApplications,
      reachedCounts,
      byStatus,
      conversionRate,
      customStageConversions,
      stageDurations,
    };
  }

  async getStageDurationVisits(
    organizationId: string,
    jobId: string,
    stageId: string,
    customStart: string | undefined,
    customEnd: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<StageDurationVisitPage> {
    const params = [
      organizationId,
      customStart ?? null,
      customEnd ?? null,
      jobId,
      stageId,
    ];
    const [countRows, visitRows] = await Promise.all([
      this.statusHistoryRepository.query<{ total: number }[]>(
        `${COMPLETED_STAGE_VISITS_CTE}
         SELECT COUNT(*)::int AS total
         FROM completed_visits
         WHERE job_id = $4 AND stage_id = $5`,
        params,
      ),
      this.statusHistoryRepository.query<
        {
          visitId: string;
          applicationId: string;
          jobId: string;
          applicantName: string;
          enteredAt: string;
          exitedAt: string;
          durationDays: number | string;
        }[]
      >(
        `${COMPLETED_STAGE_VISITS_CTE}
         SELECT visit.visit_id AS "visitId",
           visit.application_id AS "applicationId",
           candidate.name AS "applicantName",
           TO_CHAR(visit.entered_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "enteredAt",
           TO_CHAR(visit.exited_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "exitedAt",
           visit.duration_days AS "durationDays"
         FROM completed_visits visit
         INNER JOIN application ON application.id = visit.application_id
         INNER JOIN "user" candidate ON candidate.id = application."candidateId"
         WHERE visit.job_id = $4 AND visit.stage_id = $5
         ORDER BY visit.entered_at DESC, visit.visit_id DESC
         LIMIT $6 OFFSET $7`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
    ]);

    return {
      rows: visitRows.map(row => ({
        ...row,
        durationDays: Number(row.durationDays),
      })),
      total: Number(countRows[0]?.total ?? 0),
      page,
      pageSize,
    };
  }

  async getCustomStageApplications(
    organizationId: string,
    jobId: string,
    stageId: string,
    customStart: string | undefined,
    customEnd: string | undefined,
    page: number,
    pageSize: number,
    period = customStart && customEnd ? 'custom' : 'month',
  ): Promise<CustomStageApplicationPage> {
    const stageDateRange = this.getPeriodDates(
      new Date(),
      period,
      customStart,
      customEnd,
    );
    const params = [
      organizationId,
      stageDateRange.startOfPeriod,
      stageDateRange.endOfPeriod,
      jobId,
      stageId,
    ];
    const cohort = `${CUSTOM_STAGE_ENTRIES_CTE}, selected_stage AS (
      SELECT * FROM stage_cohort
      WHERE job_id = $4 AND stage_id = $5
    )`;
    const [countRows, applicationRows] = await Promise.all([
      this.statusHistoryRepository.query<{ total: number }[]>(
        `${cohort} SELECT COUNT(*)::int AS total FROM selected_stage`,
        params,
      ),
      this.statusHistoryRepository.query<
        {
          applicationId: string;
          applicantName: string;
          stageNameAtEntry: string | null;
          firstEnteredAt: string;
          advanced: boolean;
          currentStatus: string;
        }[]
      >(
        `${cohort}
        SELECT selected_stage.application_id AS "applicationId",
          candidate.name AS "applicantName",
          selected_stage.stage_name_snapshot AS "stageNameAtEntry",
          TO_CHAR(selected_stage.first_entered_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "firstEnteredAt",
          selected_stage.advanced,
          selected_stage.current_status AS "currentStatus"
        FROM selected_stage
        INNER JOIN application ON application.id = selected_stage.application_id
        INNER JOIN "user" candidate ON candidate.id = application."candidateId"
        ORDER BY selected_stage.first_entered_at DESC, selected_stage.application_id DESC
        LIMIT $6 OFFSET $7`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
    ]);

    return {
      rows: applicationRows,
      total: Number(countRows[0]?.total ?? 0),
      page,
      pageSize,
    };
  }

  async getResponseTimeVisits(
    organizationId: string,
    bucket: ResponseTimeBucket,
    period: string,
    customStart: string | undefined,
    customEnd: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<ResponseTimeVisitPage> {
    const now = new Date();
    const { startOfPeriod, endOfPeriod } = this.getPeriodDates(
      now,
      period,
      customStart,
      customEnd,
    );
    const params = [organizationId, startOfPeriod, endOfPeriod, bucket];
    const bucketFilter = `(
      ($4 = 'lessThan24h' AND duration < INTERVAL '24 hours') OR
      ($4 = 'oneToThreeDays' AND duration >= INTERVAL '24 hours' AND duration < INTERVAL '3 days') OR
      ($4 = 'threeToSevenDays' AND duration >= INTERVAL '3 days' AND duration < INTERVAL '7 days') OR
      ($4 = 'moreThanSevenDays' AND duration >= INTERVAL '7 days') OR
      ($4 = 'unanswered' AND duration IS NULL AND current_status NOT IN ('contratado', 'rechazado', 'desistido'))
    )`;
    const [countRows, visitRows] = await Promise.all([
      this.statusHistoryRepository.query<{ total: number }[]>(
        `${RESPONSE_TIME_CTE} SELECT COUNT(*)::int AS total
         FROM response_durations WHERE ${bucketFilter}`,
        params,
      ),
      this.statusHistoryRepository.query<
        {
          applicationId: string;
          jobId: string;
          applicantName: string;
          jobTitle: string;
          submittedAt: string;
          respondedAt: string | null;
          responseDays: number | string | null;
          currentStatus: string;
        }[]
      >(
        `${RESPONSE_TIME_CTE}
         SELECT response.id AS "applicationId", response.job_id AS "jobId",
           candidate.name AS "applicantName",
           response.job_title AS "jobTitle",
           TO_CHAR(response."createdAt", 'YYYY-MM-DD"T"HH24:MI:SS"Z"') AS "submittedAt",
           CASE WHEN response.responded_at IS NULL THEN NULL
             ELSE TO_CHAR(response.responded_at, 'YYYY-MM-DD"T"HH24:MI:SS"Z"') END AS "respondedAt",
           EXTRACT(EPOCH FROM response.duration) / 86400.0 AS "responseDays",
           response.current_status AS "currentStatus"
         FROM response_durations response
         INNER JOIN "user" candidate ON candidate.id = response."candidateId"
         WHERE ${bucketFilter}
         ORDER BY response."createdAt" DESC, response.id DESC
         LIMIT $5 OFFSET $6`,
        [...params, pageSize, (page - 1) * pageSize],
      ),
    ]);

    return {
      rows: visitRows.map(row => ({
        ...row,
        responseDays:
          row.responseDays === null ? null : Number(row.responseDays),
      })),
      total: Number(countRows[0]?.total ?? 0),
      page,
      pageSize,
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
    const results: { city: string; count: string }[] =
      await this.applicationRepository
        .createQueryBuilder('application')
        .leftJoin('application.candidate', 'candidate')
        .leftJoin('application.job', 'job')
        .where('job.organizationId = :organizationId', { organizationId })
        .andWhere('job.status = :activeStatus', {
          activeStatus: JobStatus.ACTIVE,
        })
        .andWhere(
          '(job.expiresAt IS NULL OR job.expiresAt > CURRENT_TIMESTAMP)',
        )
        .andWhere("NULLIF(BTRIM(candidate.location->>'city'), '') IS NOT NULL")
        .andWhere("LOWER(BTRIM(candidate.location->>'city')) <> 'unknown'")
        .select("BTRIM(candidate.location->>'city')", 'city')
        .addSelect('COUNT(*)', 'count')
        .groupBy("BTRIM(candidate.location->>'city')")
        .orderBy('count', 'DESC')
        .limit(10)
        .getRawMany();

    const total = results.reduce(
      (sum, row) => sum + parseInt(row.count, 10),
      0,
    );

    return results.map(row => ({
      city: row.city,
      count: parseInt(row.count, 10),
      percentage:
        total > 0 ? Math.round((parseInt(row.count, 10) / total) * 100) : 0,
    }));
  }

  async getAvgHiringTimeDays(
    organizationId: string,
    period = 'month',
    customStart?: string,
    customEnd?: string,
  ): Promise<number> {
    const { startOfPeriod, endOfPeriod } = this.getPeriodDates(
      new Date(),
      period,
      customStart,
      customEnd,
    );
    const [result] = await this.statusHistoryRepository.query<
      { avgDays: number | string | null }[]
    >(
      `WITH application_cohort AS (
        SELECT application.id, application."createdAt" AS created_at
        FROM application
        INNER JOIN job ON job.id = application."jobId"
        WHERE job."organizationId" = $1
          AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= $2::date
          AND ((application."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < $3::date
      ), first_hire AS (
        SELECT cohort.id, cohort.created_at,
          MIN(history.changed_at AT TIME ZONE 'UTC') AS hired_at
        FROM application_cohort cohort
        INNER JOIN application_status_history history
          ON history.application_id = cohort.id
        WHERE history.new_status = 'contratado'
          AND history.transition_kind = 'stage'
          AND history.previous_status IS NOT NULL
        GROUP BY cohort.id, cohort.created_at
      )
      SELECT AVG(
        EXTRACT(EPOCH FROM (first_hire.hired_at - (first_hire.created_at AT TIME ZONE 'UTC'))) / 86400.0
      )::double precision AS "avgDays"
      FROM first_hire
      WHERE first_hire.hired_at > (first_hire.created_at AT TIME ZONE 'UTC')`,
      [organizationId, startOfPeriod, endOfPeriod],
    );

    const avgDays = Number(result?.avgDays ?? 0);
    return Math.round(avgDays * 10) / 10;
  }

  async getRecruiterProductivity(
    organizationId: string,
    customStart?: string,
    customEnd?: string,
  ): Promise<RecruiterProductivity[]> {
    const members = await this.memberRepository.find({
      where: { organizationId },
      relations: { user: true },
    });

    if (members.length === 0) return [];

    let firstResponseQuery = this.statusHistoryRepository
      .createQueryBuilder('history')
      .innerJoin('history.application', 'application')
      .innerJoin('application.job', 'job')
      .where('job.organizationId = :organizationId', { organizationId })
      .andWhere('history.changedById IS NOT NULL')
      .andWhere('history.transitionKind = :stageTransition', {
        stageTransition: 'stage',
      })
      .andWhere('history.previousStageId IS NOT NULL')
      .andWhere('history.newStageId IS NOT NULL')
      .andWhere('history.previousStageId <> history.newStageId')
      .andWhere('history.changedById <> application.candidateId')
      .andWhere('history.changedAt >= application.createdAt')
      .select('application.id', 'applicationId')
      .addSelect('history.changedById', 'changedById')
      .addSelect(
        'EXTRACT(EPOCH FROM (history.changedAt - application.createdAt)) / 86400',
        'responseDays',
      )
      .distinctOn(['application.id'])
      .orderBy('application.id', 'ASC')
      .addOrderBy('history.changedAt', 'ASC')
      .addOrderBy('history.id', 'ASC');

    if (customStart) {
      firstResponseQuery = firstResponseQuery.andWhere(
        "((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= CAST(:customStart AS date)",
        { customStart },
      );
    }
    if (customEnd) {
      firstResponseQuery = firstResponseQuery.andWhere(
        "((application.createdAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < (CAST(:customEnd AS date) + INTERVAL '1 day')",
        { customEnd },
      );
    }

    const firstResponses = await firstResponseQuery.getRawMany<{
      changedById: string;
      responseDays: string;
    }>();
    const responseTimeTotalsByRecruiter = new Map<
      string,
      { totalDays: number; count: number }
    >();

    for (const row of firstResponses) {
      const aggregate = responseTimeTotalsByRecruiter.get(row.changedById) ?? {
        totalDays: 0,
        count: 0,
      };
      responseTimeTotalsByRecruiter.set(row.changedById, {
        totalDays: aggregate.totalDays + Number(row.responseDays),
        count: aggregate.count + 1,
      });
    }

    const results = await Promise.all(
      members.map(async member => {
        const userId = member.userId;

        let processedApplicationsQuery = this.statusHistoryRepository
          .createQueryBuilder('history')
          .innerJoin('history.application', 'application')
          .innerJoin('application.job', 'job')
          .where('job.organizationId = :organizationId', { organizationId })
          .andWhere('history.changedById = :userId', { userId })
          .andWhere('history.newStatus != :pending', {
            pending: ApplicationStatus.PENDIENTE,
          })
          .select('COUNT(DISTINCT application.id)', 'count');

        let interviewQuery = this.eventRepository
          .createQueryBuilder('event')
          .where('event.organizationId = :organizationId', { organizationId })
          .andWhere('event.type = :type', { type: EventType.INTERVIEW })
          .andWhere('event.organizerId = :userId', { userId })
          .andWhere('event.status = :status', {
            status: EventStatus.COMPLETED,
          });

        if (customStart) {
          processedApplicationsQuery = processedApplicationsQuery.andWhere(
            "((history.changedAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date >= CAST(:customStart AS date)",
            { customStart },
          );
          interviewQuery = interviewQuery.andWhere(
            "event.startAt >= (CAST(:customStart AS date)::timestamp AT TIME ZONE 'America/Santiago')",
            { customStart },
          );
        }
        if (customEnd) {
          processedApplicationsQuery = processedApplicationsQuery.andWhere(
            "((history.changedAt AT TIME ZONE 'UTC') AT TIME ZONE 'America/Santiago')::date < (CAST(:customEnd AS date) + INTERVAL '1 day')",
            { customEnd },
          );
          interviewQuery = interviewQuery.andWhere(
            "event.startAt < ((CAST(:customEnd AS date) + INTERVAL '1 day')::timestamp AT TIME ZONE 'America/Santiago')",
            { customEnd },
          );
        }

        const [processedApplications, interviews] = await Promise.all([
          processedApplicationsQuery.getRawOne<{ count: string }>(),
          interviewQuery.getCount(),
        ]);
        const responseTimeAggregate = responseTimeTotalsByRecruiter.get(userId);
        const avgResponseTimeDays = responseTimeAggregate?.count
          ? responseTimeAggregate.totalDays / responseTimeAggregate.count
          : 0;

        return {
          userId,
          userName: member.user?.name ?? 'Unknown',
          userEmail: member.user?.email ?? '',
          applicationsProcessed: Number(processedApplications?.count ?? 0),
          interviewsConducted: interviews,
          avgResponseTimeDays: Math.round(avgResponseTimeDays * 10) / 10,
        };
      }),
    );

    return results;
  }

  async getResponseTimeDistribution(
    organizationId: string,
    period: string,
    customStart?: string,
    customEnd?: string,
  ): Promise<{
    distribution: ResponseTimeDistribution;
    unansweredCount: number;
  }> {
    const now = new Date();
    const { startOfPeriod, endOfPeriod } = this.getPeriodDates(
      now,
      period,
      customStart,
      customEnd,
    );

    const [row] = await this.statusHistoryRepository.query<
      {
        lessThan24h: number | string;
        oneToThreeDays: number | string;
        threeToSevenDays: number | string;
        moreThanSevenDays: number | string;
        unansweredCount: number | string;
      }[]
    >(
      `${RESPONSE_TIME_CTE}
      SELECT
        COUNT(*) FILTER (WHERE duration < INTERVAL '24 hours')::int AS "lessThan24h",
        COUNT(*) FILTER (WHERE duration >= INTERVAL '24 hours' AND duration < INTERVAL '3 days')::int AS "oneToThreeDays",
        COUNT(*) FILTER (WHERE duration >= INTERVAL '3 days' AND duration < INTERVAL '7 days')::int AS "threeToSevenDays",
        COUNT(*) FILTER (WHERE duration >= INTERVAL '7 days')::int AS "moreThanSevenDays",
        COUNT(*) FILTER (
          WHERE duration IS NULL
            AND current_status NOT IN ('contratado', 'rechazado', 'desistido')
        )::int AS "unansweredCount"
      FROM response_durations`,
      [organizationId, startOfPeriod, endOfPeriod],
    );

    const distribution: ResponseTimeDistribution = {
      lessThan24h: Number(row?.lessThan24h ?? 0),
      oneToThreeDays: Number(row?.oneToThreeDays ?? 0),
      threeToSevenDays: Number(row?.threeToSevenDays ?? 0),
      moreThanSevenDays: Number(row?.moreThanSevenDays ?? 0),
    };

    return {
      distribution,
      unansweredCount: Number(row?.unansweredCount ?? 0),
    };
  }

  private getPeriodDates(
    date: Date,
    period: string,
    customStart?: string,
    customEnd?: string,
  ): { startOfPeriod: string; endOfPeriod: string; startOfLastPeriod: string } {
    if (period === 'custom' && customStart && customEnd) {
      const startOfPeriod = new Date(`${customStart}T00:00:00.000Z`);
      const endOfPeriod = new Date(`${customEnd}T00:00:00.000Z`);
      endOfPeriod.setUTCDate(endOfPeriod.getUTCDate() + 1);
      const durationMs = endOfPeriod.getTime() - startOfPeriod.getTime();
      const startOfLastPeriod = new Date(startOfPeriod.getTime() - durationMs);

      return {
        startOfPeriod: startOfPeriod.toISOString().split('T')[0],
        endOfPeriod: endOfPeriod.toISOString().split('T')[0],
        startOfLastPeriod: startOfLastPeriod.toISOString().split('T')[0],
      };
    }

    const [month, day, year] = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Santiago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
      .format(date)
      .split('/');
    const now = new Date(`${year}-${month}-${day}T00:00:00.000Z`);

    let startOfPeriod: Date;
    let endOfPeriod: Date;
    let startOfLastPeriod: Date;

    if (period === 'week') {
      // Current week starting Monday
      const daysSinceMonday = (now.getUTCDay() + 6) % 7;
      startOfPeriod = new Date(now);
      startOfPeriod.setUTCDate(now.getUTCDate() - daysSinceMonday);

      // End of current week (next Monday)
      endOfPeriod = new Date(startOfPeriod);
      endOfPeriod.setUTCDate(startOfPeriod.getUTCDate() + 7);

      // Last week
      startOfLastPeriod = new Date(startOfPeriod);
      startOfLastPeriod.setUTCDate(startOfPeriod.getUTCDate() - 7);
    } else if (period === 'month') {
      // First day of current month
      startOfPeriod = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
      );

      // First day of next month (for upper bound)
      endOfPeriod = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
      );

      // First day of last month
      startOfLastPeriod = new Date(
        Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1),
      );
    } else {
      // First day of current year
      startOfPeriod = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));

      // First day of next year
      endOfPeriod = new Date(Date.UTC(now.getUTCFullYear() + 1, 0, 1));

      // First day of last year
      startOfLastPeriod = new Date(Date.UTC(now.getUTCFullYear() - 1, 0, 1));
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

import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrganizationEntity } from '../../infrastructure/database/orm/organization.entity';
import { ApplicationEntity } from '../../infrastructure/database/orm/application.entity';
import { EventEntity } from '../../infrastructure/database/orm/event.entity';
import { OrganizationMemberEntity } from '../../infrastructure/database/orm/organization-member.entity';
import { JobEntity } from '../../infrastructure/database/orm/job.entity';
import { ApplicationStatus } from '../domain/enums';

@Injectable()
export class MetricsReportService {
  private readonly logger = new Logger(MetricsReportService.name);

  constructor(
    @InjectRepository(OrganizationEntity)
    private readonly orgRepository: Repository<OrganizationEntity>,
    @InjectRepository(ApplicationEntity)
    private readonly appRepository: Repository<ApplicationEntity>,
    @InjectRepository(EventEntity)
    private readonly eventRepository: Repository<EventEntity>,
    @InjectRepository(OrganizationMemberEntity)
    private readonly memberRepository: Repository<OrganizationMemberEntity>,
    @InjectRepository(JobEntity)
    private readonly jobRepository: Repository<JobEntity>,
  ) {}

  @Cron(CronExpression.EVERY_WEEK)
  async generateWeeklyReport(): Promise<void> {
    this.logger.log('Generating weekly metrics report for all organizations...');

    const organizations = await this.orgRepository.find();
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    for (const org of organizations) {
      try {
        const report = await this.buildWeeklyReport(org, weekAgo, now);
        this.logger.log(`Report for ${org.name}: ${JSON.stringify(report)}`);
        // TODO: Integrate email service (Resend/SES) when available
        // await this.emailService.sendReport(org, report);
      } catch (err) {
        this.logger.error(`Failed to generate report for ${org.name}`, err);
      }
    }

    this.logger.log('Weekly report generation complete.');
  }

  private async buildWeeklyReport(
    org: OrganizationEntity,
    from: Date,
    to: Date,
  ): Promise<Record<string, unknown>> {
    const newApplications = await this.appRepository
      .createQueryBuilder('app')
      .leftJoin('app.job', 'job')
      .where('job.organizationId = :orgId', { orgId: org.id })
      .andWhere('app.createdAt >= :from', { from })
      .andWhere('app.createdAt <= :to', { to })
      .getCount();

    const interviewsScheduled = await this.eventRepository
      .createQueryBuilder('event')
      .where('event.organizationId = :orgId', { orgId: org.id })
      .andWhere('event.type = :type', { type: 'interview' })
      .andWhere('event.createdAt >= :from', { from })
      .andWhere('event.createdAt <= :to', { to })
      .getCount();

    const hiredCount = await this.appRepository
      .createQueryBuilder('app')
      .leftJoin('app.job', 'job')
      .where('job.organizationId = :orgId', { orgId: org.id })
      .andWhere('app.status = :status', { status: ApplicationStatus.CONTRATADO })
      .andWhere('app.stageChangedAt >= :from', { from })
      .andWhere('app.stageChangedAt <= :to', { to })
      .getCount();

    const activeJobs = await this.jobRepository.count({
      where: { organizationId: org.id },
    });

    const memberCount = await this.memberRepository.count({
      where: { organizationId: org.id },
    });

    return {
      organizationId: org.id,
      organizationName: org.name,
      period: { from: from.toISOString(), to: to.toISOString() },
      summary: {
        activeJobs,
        newApplications,
        interviewsScheduled,
        hiredCount,
        teamMembers: memberCount,
      },
    };
  }
}
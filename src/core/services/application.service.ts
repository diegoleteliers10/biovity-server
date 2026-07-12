import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
  LoggerService,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IApplicationRepository } from '../repositories/application.respository';
import { IJobRepository } from '../repositories/job.repository';
import { IUserRepository } from '../repositories/user.repository';
import { IOrganizationRepository } from '../repositories/organization.repository';
import { IJobQuestionRepository } from '../repositories/job-question.repository';
import { IApplicationAnswerRepository } from '../repositories/application-answer.repository';
import {
  IApplicationUseCase,
  CreateApplicationInput,
} from '../use-cases/application/application.use-case';
import {
  Application,
  ApplicationAnswer,
} from '../domain/entities/application.entity';
import {
  ApplicationStatus,
  NotificationType,
  QuestionStatus,
  UserType,
} from '../domain/enums';
import { ApplicationEntity } from '../../infrastructure/database/orm/application.entity';
import { ApplicationAnswerEntity } from '../../infrastructure/database/orm/application-answer.entity';
import { ApplicationDomainOrmMapper } from '../../shared/mappers/application/applicationDomain-orm.mapper';
import { LOGGER_TOKEN } from '../../shared/logger/logger.service';
import {
  NotificationService,
  applicationStatusLabel,
} from '../../shared/notification';

const APPLICATIONS_LINK = '/dashboard/applications';
const MY_APPLICATIONS_LINK = '/dashboard/my-applications';

@Injectable()
export class ApplicationService implements IApplicationUseCase {
  constructor(
    @Inject('IApplicationRepository')
    private readonly applicationRepository: IApplicationRepository,
    @Inject('IJobRepository')
    private readonly jobRepository: IJobRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
    @Inject('IJobQuestionRepository')
    private readonly jobQuestionRepository: IJobQuestionRepository,
    @Inject('IApplicationAnswerRepository')
    private readonly applicationAnswerRepository: IApplicationAnswerRepository,
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly notificationService: NotificationService,
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createApplication(data: CreateApplicationInput): Promise<Application> {
    const job = await this.jobRepository.findById(data.jobId);
    if (!job) {
      throw new NotFoundException(`Job with id ${data.jobId} not found`);
    }

    const candidate = await this.userRepository.findById(data.candidateId);
    if (!candidate) {
      throw new NotFoundException(`User with id ${data.candidateId} not found`);
    }

    const existingApplication =
      await this.applicationRepository.findByJobAndCandidate(
        data.jobId,
        data.candidateId,
      );
    if (existingApplication) {
      throw new ConflictException(
        `User with id ${data.candidateId} already applied to job ${data.jobId}`,
      );
    }

    if (data.salaryMin !== undefined && data.salaryMax !== undefined) {
      if (data.salaryMin > data.salaryMax) {
        throw new BadRequestException(
          'salaryMin cannot be greater than salaryMax',
        );
      }
    }

    const publishedQuestions = await this.jobQuestionRepository.findByJobId(
      data.jobId,
      QuestionStatus.PUBLISHED,
    );

    if (data.answers && data.answers.length > 0) {
      const questionIds = publishedQuestions.map(q => q.id);
      const answerQuestionIds = data.answers.map(a => a.questionId);

      const invalidQuestionIds = answerQuestionIds.filter(
        id => !questionIds.includes(id),
      );
      if (invalidQuestionIds.length > 0) {
        throw new BadRequestException(
          `Invalid question IDs: ${invalidQuestionIds.join(', ')}`,
        );
      }

      const requiredQuestions = publishedQuestions.filter(q => q.required);
      const answeredRequiredIds = data.answers
        .filter(a => requiredQuestions.some(rq => rq.id === a.questionId))
        .map(a => a.questionId);

      const missingRequiredIds = requiredQuestions
        .filter(rq => !answeredRequiredIds.includes(rq.id))
        .map(rq => rq.id);

      if (missingRequiredIds.length > 0) {
        throw new BadRequestException(
          `Missing required answers for questions: ${missingRequiredIds.join(', ')}`,
        );
      }
    }

    const application = new Application(
      this.generateId(),
      data.jobId,
      data.candidateId,
      new Date(),
      new Date(),
      ApplicationStatus.PENDIENTE,
      new Date(),
      data.coverLetter,
      data.salaryMin,
      data.salaryMax,
      data.salaryCurrency,
      data.availabilityDate,
      data.resumeUrl,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdApplication: Application;
    try {
      const applicationOrm = ApplicationDomainOrmMapper.toOrm(application);
      const savedOrm = await queryRunner.manager.save(
        ApplicationEntity,
        applicationOrm,
      );

      const savedAnswers =
        data.answers && data.answers.length > 0
          ? await queryRunner.manager.save(
              ApplicationAnswerEntity,
              data.answers.map(a => {
                const entity = new ApplicationAnswerEntity();
                entity.id = this.generateId();
                entity.applicationId = savedOrm.id;
                entity.questionId = a.questionId;
                entity.value = a.value;
                entity.createdAt = new Date();
                return entity;
              }),
            )
          : [];

      await queryRunner.commitTransaction();

      createdApplication = ApplicationDomainOrmMapper.toDomain(savedOrm);
      if (savedAnswers.length > 0) {
        (
          createdApplication as unknown as { answers: ApplicationAnswer[] }
        ).answers = savedAnswers.map(
          e =>
            new ApplicationAnswer(
              e.id,
              e.applicationId,
              e.questionId,
              e.value,
              e.createdAt,
            ),
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    await this.notifyNewApplication({
      applicationId: createdApplication.id,
      candidateId: createdApplication.candidateId,
      candidateName: candidate.name,
      jobId: createdApplication.jobId,
      jobTitle: job.title,
      organizationId: job.organizationId,
    });

    return createdApplication;
  }

  async getApplicationById(id: string): Promise<Application | null> {
    return this.applicationRepository.findById(id);
  }

  async getApplicationsByJobId(
    jobId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{
    data: Application[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.applicationRepository.findByJobId(jobId, pagination);
  }

  async getApplicationsByCandidateId(
    candidateId: string,
    pagination?: { page?: number; limit?: number },
  ): Promise<{
    data: Application[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.applicationRepository.findByCandidateId(
      candidateId,
      pagination,
    );
  }

  async updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
    changedById?: string | null,
  ): Promise<Application | null> {
    const existingApplication = await this.applicationRepository.findById(id);
    if (!existingApplication) {
      throw new NotFoundException(`Application with id ${id} not found`);
    }

    if (existingApplication.status === status) {
      return existingApplication;
    }

    const updated = await this.applicationRepository.update(id, { status }, changedById);
    if (!updated) {
      return null;
    }

    await this.notifyApplicationStageChange({
      applicationId: existingApplication.id,
      candidateId: existingApplication.candidateId,
      jobId: existingApplication.jobId,
      status,
    });

    return updated;
  }

  private async notifyNewApplication(context: {
    applicationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    organizationId: string;
  }): Promise<void> {
    // EXCEPTION. REASON: post-commit best-effort side-effect. Any failure here
    // (recipient lookup or insert) must never break the already-committed
    // application creation.
    try {
      const recipients = await this.userRepository.findIdsByOrganizationId(
        context.organizationId,
        UserType.ORGANIZATION,
      );
      const targets = recipients.filter(id => id !== context.candidateId);
      if (targets.length === 0) {
        return;
      }

      await this.notificationService.createMany(
        targets.map(userId => ({
          userId,
          type: NotificationType.APPLICATION,
          title: 'Nueva postulacion',
          body: `${context.candidateName} postulo a ${context.jobTitle}`,
          link: APPLICATIONS_LINK,
          data: {
            applicationId: context.applicationId,
            jobId: context.jobId,
            candidateId: context.candidateId,
          },
          dedupKey: `app:${context.applicationId}:created`,
        })),
      );

      // Webhook delivery
      const organization = await this.organizationRepository.findById(context.organizationId);
      if (organization?.integrations?.enabled) {
        const { slackWebhookUrl, discordWebhookUrl } = organization.integrations;
        
        const message = `📢 *Nueva Postulación en Biovity*\nEl candidato *${context.candidateName}* se ha postulado a la oferta *${context.jobTitle}*.\nVer más aquí: http://localhost:3000${APPLICATIONS_LINK}`;

        if (slackWebhookUrl) {
          await this.sendWebhook(slackWebhookUrl, { text: message });
        }
        if (discordWebhookUrl) {
          await this.sendWebhook(discordWebhookUrl, { content: message });
        }
      }
    } catch (error) {
      this.logger.error(
        `new application notification failed: ${(error as Error).message}`,
        (error as Error).stack,
        'ApplicationService',
      );
    }
  }

  private async sendWebhook(url: string, payload: Record<string, any>): Promise<void> {
    try {
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      this.logger.error(
        `Failed to send webhook to ${url}: ${(error as Error).message}`,
        (error as Error).stack,
        'ApplicationService',
      );
    }
  }

  private async notifyApplicationStageChange(context: {
    applicationId: string;
    candidateId: string;
    jobId: string;
    status: ApplicationStatus;
  }): Promise<void> {
    // EXCEPTION. REASON: post-commit best-effort side-effect. Any failure here
    // (job lookup or insert) must never break the already-committed status
    // update.
    try {
      const job = await this.jobRepository.findById(context.jobId);
      await this.notificationService.create({
        userId: context.candidateId,
        type: NotificationType.APPLICATION,
        title: 'Actualizacion de postulacion',
        body: `Tu postulacion a ${job?.title ?? 'la vacante'} paso a ${applicationStatusLabel(context.status)}`,
        link: MY_APPLICATIONS_LINK,
        data: {
          applicationId: context.applicationId,
          jobId: context.jobId,
          status: context.status,
        },
        dedupKey: `app:${context.applicationId}:status:${context.status}`,
      });
    } catch (error) {
      this.logger.error(
        `application stage notification failed: ${(error as Error).message}`,
        (error as Error).stack,
        'ApplicationService',
      );
    }
  }

  async deleteApplication(id: string): Promise<boolean> {
    const existingApplication = await this.applicationRepository.findById(id);
    if (!existingApplication) {
      throw new NotFoundException(`Application with id ${id} not found`);
    }

    return this.applicationRepository.delete(id);
  }

  async checkExistingApplication(
    jobId: string,
    candidateId: string,
  ): Promise<boolean> {
    const existingApplication =
      await this.applicationRepository.findByJobAndCandidate(
        jobId,
        candidateId,
      );
    return !!existingApplication;
  }

  async getApplicationsByOrganizationId(
    organizationId: string,
    pagination?: { page?: number; limit?: number },
    includeAnswers?: boolean,
  ): Promise<{
    data: Application[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.applicationRepository.findByOrganizationId(
      organizationId,
      pagination,
    );

    if (includeAnswers && result.data.length > 0) {
      const appIds = result.data.map(app => app.id);
      const allAnswers =
        await this.applicationAnswerRepository.findByApplicationIds(appIds);
      const answersByApp = new Map<string, typeof allAnswers>();
      for (const answer of allAnswers) {
        const list = answersByApp.get(answer.applicationId) ?? [];
        list.push(answer);
        answersByApp.set(answer.applicationId, list);
      }
      for (const app of result.data) {
        (app as unknown as { answers: typeof allAnswers }).answers =
          answersByApp.get(app.id) ?? [];
      }
    }

    return result;
  }
}

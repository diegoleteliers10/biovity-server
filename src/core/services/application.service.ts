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
import type {
  IApplicationRepository,
  ApplicationStatusHistoryItem,
} from '../repositories/application.respository';
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
import { ApplicationStatus, QuestionStatus, UserType } from '../domain/enums';
import {
  ApplicationEntity,
  ApplicationStatusHistoryEntity,
  PipelineStageEntity,
} from '../../infrastructure/database/orm';
import { ApplicationAnswerEntity } from '../../infrastructure/database/orm/application-answer.entity';
import { ApplicationDomainOrmMapper } from '../../shared/mappers/application/applicationDomain-orm.mapper';
import { LOGGER_TOKEN } from '../../shared/logger/logger.service';

const APPLICATIONS_LINK = '/dashboard/applications';

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
    @Inject(LOGGER_TOKEN) private readonly logger: LoggerService,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createApplication(
    data: CreateApplicationInput,
  ): Promise<Application | null> {
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
      undefined,
      null,
      null,
      null,
      null,
      data.sourceChannel ?? 'unknown',
      data.distributionSourceId
        ? 'tracked_link'
        : data.sourceChannel
          ? 'self_reported'
          : 'unknown',
      data.distributionSourceId ?? null,
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    let createdApplication: Application;
    try {
      if (data.resumeUrl) {
        const resumes = await queryRunner.manager.query<
          Array<{ path: string | null; url: string | null }>
        >(
          `SELECT "cvFile"->>'path' AS path, "cvFile"->>'url' AS url
             FROM public.resume
            WHERE "userId" = $1::uuid
            FOR SHARE`,
          [data.candidateId],
        );
        const currentCv = resumes[0];
        const requested = data.resumeUrl.trim().split('?')[0];
        const currentUrl = currentCv?.url?.split('?')[0];
        const encodedPath = currentCv?.path?.replaceAll('/', '%2F');
        const matchesCurrentCv = Boolean(
          currentCv?.path &&
          (requested === currentCv.path ||
            requested === currentUrl ||
            requested.endsWith(`/${currentCv.path}`) ||
            requested.toLowerCase().endsWith(`/${encodedPath?.toLowerCase()}`)),
        );
        if (!matchesCurrentCv || !currentCv?.path) {
          throw new BadRequestException(
            'resumeUrl must identify the candidate current CV.',
          );
        }
        application.resumeUrl = currentCv.path;
      }
      if (data.distributionSourceId) {
        const distributionSources = await queryRunner.manager.query<
          Array<{ source_channel: Application['sourceChannel'] }>
        >(
          `SELECT source_channel
           FROM job_distribution_source
           WHERE id = $1::uuid
             AND job_id = $2::uuid
             AND disabled_at IS NULL
           FOR SHARE`,
          [data.distributionSourceId, data.jobId],
        );
        const distributionSource = distributionSources[0];
        if (!distributionSource) {
          await queryRunner.rollbackTransaction();
          return null;
        }
        application.sourceChannel = distributionSource.source_channel;
      }
      const initialStage = await queryRunner.manager.findOne(
        PipelineStageEntity,
        {
          where: {
            jobId: data.jobId,
            systemKey: ApplicationStatus.PENDIENTE,
            isArchived: false,
          },
        },
      );
      if (!initialStage) {
        throw new NotFoundException(
          `Active pending stage not found for job ${data.jobId}`,
        );
      }
      application.pipelineStageId = initialStage.id;
      const applicationOrm = ApplicationDomainOrmMapper.toOrm(application);
      const savedOrm = await queryRunner.manager.save(
        ApplicationEntity,
        applicationOrm,
      );

      await queryRunner.manager.insert(ApplicationStatusHistoryEntity, {
        applicationId: savedOrm.id,
        previousStatus: null,
        newStatus: savedOrm.status,
        changedAt: savedOrm.createdAt,
        changedById: savedOrm.candidateId,
        newStageId: initialStage.id,
        newStageName: initialStage.name,
      });

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

      const recipients = await queryRunner.manager.query<Array<{ id: string }>>(
        `SELECT id FROM "user"
         WHERE "organizationId" = $1::uuid AND type = $2
           AND id <> $3::uuid`,
        [job.organizationId, UserType.ORGANIZATION, candidate.id],
      );
      for (const { id } of recipients) {
        await queryRunner.manager.query(
          `INSERT INTO application_created_notification_intent
            (id, application_id, recipient_id, job_id, candidate_name, job_title)
           VALUES ($1::uuid, $2::uuid, $3::uuid, $4::uuid, $5, $6)`,
          [
            this.generateId(),
            savedOrm.id,
            id,
            job.id,
            candidate.name,
            job.title,
          ],
        );
      }

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

    await this.notifyNewApplicationIntegrations({
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

  async updateApplicationStatus(input: {
    applicationId: string;
    status: ApplicationStatus;
    changedById: string | null;
    rejectionNote?: string;
    rejectionReasonId?: string;
  }): Promise<Application | null> {
    const rejectionNote = input.rejectionNote?.trim() || null;
    if (input.status !== ApplicationStatus.RECHAZADO && rejectionNote) {
      throw new BadRequestException(
        'A rejection note is only valid for a rejected application',
      );
    }

    const existingApplication = await this.applicationRepository.findById(
      input.applicationId,
    );
    if (!existingApplication) {
      throw new NotFoundException(
        `Application with id ${input.applicationId} not found`,
      );
    }

    const updated = await this.applicationRepository.update({
      id: input.applicationId,
      status: input.status,
      changedById: input.changedById,
      rejectionNote,
      rejectionReasonId: input.rejectionReasonId ?? null,
    });
    if (!updated) {
      return null;
    }

    return updated;
  }

  async updateApplicationStage(input: {
    applicationId: string;
    stageId: string;
    changedById: string | null;
    rejectionNote?: string;
    rejectionReasonId?: string;
  }): Promise<Application | null> {
    const rejectionNote = input.rejectionNote?.trim() || null;
    const existing = await this.applicationRepository.findById(
      input.applicationId,
    );
    if (!existing) {
      throw new NotFoundException(
        `Application with id ${input.applicationId} not found`,
      );
    }
    const updated = await this.applicationRepository.transitionStage({
      id: input.applicationId,
      stageId: input.stageId,
      changedById: input.changedById,
      rejectionNote,
      rejectionReasonId: input.rejectionReasonId ?? null,
    });
    return updated;
  }

  async reopenApplication(input: {
    applicationId: string;
    stageId: string;
    changedById: string | null;
    reason: string;
  }): Promise<Application | null> {
    const reason = input.reason.trim();
    if (!reason) {
      return Promise.reject(
        new BadRequestException(
          'A reason is required to reopen an application',
        ),
      );
    }
    return this.applicationRepository.reopen({
      id: input.applicationId,
      stageId: input.stageId,
      changedById: input.changedById,
      reason,
    });
  }

  async updateHiringPlan(input: {
    applicationId: string;
    assigneeId?: string | null;
    nextAction?: string | null;
    targetDate?: string | null;
  }): Promise<Application | null> {
    const update = {
      id: input.applicationId,
      assigneeId: input.assigneeId,
      nextAction:
        typeof input.nextAction === 'string'
          ? input.nextAction.trim() || null
          : input.nextAction,
      targetDate: input.targetDate,
    };
    if (
      update.assigneeId === undefined &&
      update.nextAction === undefined &&
      update.targetDate === undefined
    ) {
      return Promise.reject(
        new BadRequestException('At least one hiring plan field is required'),
      );
    }
    return this.applicationRepository.updateHiringPlan(update);
  }

  async getApplicationStatusHistory(
    applicationId: string,
  ): Promise<ApplicationStatusHistoryItem[]> {
    const application =
      await this.applicationRepository.findById(applicationId);
    if (!application) {
      throw new NotFoundException(
        `Application with id ${applicationId} not found`,
      );
    }
    return this.applicationRepository.findStatusHistoryByApplicationId(
      applicationId,
    );
  }

  private async notifyNewApplicationIntegrations(context: {
    applicationId: string;
    candidateId: string;
    candidateName: string;
    jobId: string;
    jobTitle: string;
    organizationId: string;
  }): Promise<void> {
    // EXCEPTION. REASON: webhook delivery is a post-commit best-effort side effect.
    try {
      const organization = await this.organizationRepository.findById(
        context.organizationId,
      );
      if (organization?.integrations?.enabled) {
        const { slackWebhookUrl, discordWebhookUrl } =
          organization.integrations;

        const applicationsUrl = new URL(
          APPLICATIONS_LINK,
          process.env.WEB_APP_URL ?? 'https://biovity.cl',
        ).toString();
        const message = `📢 *Nueva Postulación en Biovity*\nEl candidato *${context.candidateName}* se ha postulado a la oferta *${context.jobTitle}*.\nVer más aquí: ${applicationsUrl}`;

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

  private async sendWebhook(
    url: string,
    payload: Record<string, any>,
  ): Promise<void> {
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

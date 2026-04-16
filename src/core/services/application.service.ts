import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IApplicationRepository } from '../repositories/application.respository';
import { IJobRepository } from '../repositories/job.repository';
import { IUserRepository } from '../repositories/user.repository';
import { IJobQuestionRepository } from '../repositories/job-question.repository';
import { IApplicationAnswerRepository } from '../repositories/application-answer.repository';
import {
  IApplicationUseCase,
  CreateApplicationInput,
} from '../use-cases/application/application.use-case';
import {
  Application,
  ApplicationStatus,
  ApplicationAnswer,
} from '../domain/entities/application.entity';
import { QuestionStatus } from '../domain/entities/job-question.entity';

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

    const createdApplication =
      await this.applicationRepository.create(application);

    if (data.answers && data.answers.length > 0) {
      const answers = data.answers.map(
        a =>
          new ApplicationAnswer(
            this.generateId(),
            createdApplication.id,
            a.questionId,
            a.value,
          ),
      );
      const savedAnswers =
        await this.applicationAnswerRepository.bulkCreate(answers);
      (
        createdApplication as unknown as { answers: ApplicationAnswer[] }
      ).answers = savedAnswers;
    }

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
  ): Promise<Application | null> {
    const existingApplication = await this.applicationRepository.findById(id);
    if (!existingApplication) {
      throw new NotFoundException(`Application with id ${id} not found`);
    }

    return this.applicationRepository.update(id, { status });
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
  ): Promise<{
    data: Application[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.applicationRepository.findByOrganizationId(
      organizationId,
      pagination,
    );
  }
}

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IJobQuestionRepository } from '../repositories/job-question.repository';
import { IJobRepository } from '../repositories/job.repository';
import {
  IJobQuestionUseCase,
  CreateQuestionInput,
  UpdateQuestionInput,
} from '../use-cases/job-question/job-question.use-case';
import {
  JobQuestion,
  QuestionType,
  QuestionStatus,
} from '../domain/entities/job-question.entity';

@Injectable()
export class JobQuestionService implements IJobQuestionUseCase {
  constructor(
    private readonly jobQuestionRepository: IJobQuestionRepository,
    private readonly jobRepository: IJobRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createQuestion(data: CreateQuestionInput): Promise<JobQuestion> {
    const job = await this.jobRepository.findById(data.jobId);
    if (!job) {
      throw new NotFoundException(`Job with id ${data.jobId} not found`);
    }

    if (job.organizationId !== data.organizationId) {
      throw new ForbiddenException('Job does not belong to this organization');
    }

    const maxOrder = await this.jobQuestionRepository.getMaxOrderIndex(
      data.jobId,
    );

    const question = new JobQuestion(
      this.generateId(),
      data.jobId,
      data.organizationId,
      data.label,
      data.type,
      data.required ?? false,
      data.orderIndex ?? maxOrder + 1,
      data.status ?? QuestionStatus.DRAFT,
      data.placeholder,
      data.helperText,
      data.options,
    );

    return this.jobQuestionRepository.create(question);
  }

  async getQuestionById(id: string): Promise<JobQuestion | null> {
    return this.jobQuestionRepository.findById(id);
  }

  async getQuestionsByJobId(jobId: string): Promise<JobQuestion[]> {
    return this.jobQuestionRepository.findByJobId(
      jobId,
      QuestionStatus.PUBLISHED,
    );
  }

  async getQuestionsByOrganizationId(
    organizationId: string,
  ): Promise<JobQuestion[]> {
    return this.jobQuestionRepository.findByOrganizationId(organizationId);
  }

  async updateQuestion(
    id: string,
    data: UpdateQuestionInput,
  ): Promise<JobQuestion | null> {
    const existing = await this.jobQuestionRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Question with id ${id} not found`);
    }

    if (
      data.type === QuestionType.SELECT ||
      data.type === QuestionType.MULTISELECT
    ) {
      if (!data.options || data.options.length < 2) {
        throw new BadRequestException(
          'Select and multiselect questions require at least 2 options',
        );
      }
    }

    return this.jobQuestionRepository.update(id, data);
  }

  async publishQuestion(id: string): Promise<JobQuestion | null> {
    const existing = await this.jobQuestionRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Question with id ${id} not found`);
    }

    return this.jobQuestionRepository.update(id, {
      status: QuestionStatus.PUBLISHED,
    });
  }

  async unpublishQuestion(id: string): Promise<JobQuestion | null> {
    const existing = await this.jobQuestionRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Question with id ${id} not found`);
    }

    return this.jobQuestionRepository.update(id, {
      status: QuestionStatus.DRAFT,
    });
  }

  async reorderQuestions(
    jobId: string,
    items: { id: string; orderIndex: number }[],
  ): Promise<void> {
    for (const item of items) {
      const question = await this.jobQuestionRepository.findByIdAndJobId(
        item.id,
        jobId,
      );
      if (!question) {
        throw new NotFoundException(
          `Question with id ${item.id} not found for this job`,
        );
      }
    }

    await this.jobQuestionRepository.bulkUpdateOrder(items);
  }

  async deleteQuestion(id: string): Promise<boolean> {
    const existing = await this.jobQuestionRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Question with id ${id} not found`);
    }

    return this.jobQuestionRepository.delete(id);
  }
}

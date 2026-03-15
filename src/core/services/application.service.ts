import {
  Injectable,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { IApplicationRepository } from '../repositories/application.respository';
import { IJobRepository } from '../repositories/job.repository';
import { IUserRepository } from '../repositories/user.repository';
import {
  IApplicationUseCase,
  CreateApplicationInput,
} from '../use-cases/application/application.use-case';
import {
  Application,
  ApplicationStatus,
} from '../domain/entities/application.entity';

@Injectable()
export class ApplicationService implements IApplicationUseCase {
  constructor(
    @Inject('IApplicationRepository')
    private readonly applicationRepository: IApplicationRepository,
    @Inject('IJobRepository')
    private readonly jobRepository: IJobRepository,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createApplication(data: CreateApplicationInput): Promise<Application> {
    // Verify job exists
    const job = await this.jobRepository.findById(data.jobId);
    if (!job) {
      throw new NotFoundException(`Job with id ${data.jobId} not found`);
    }

    // Verify candidate exists
    const candidate = await this.userRepository.findById(data.candidateId);
    if (!candidate) {
      throw new NotFoundException(`User with id ${data.candidateId} not found`);
    }

    // Check if user already applied to this job
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

    const application = new Application(
      this.generateId(),
      data.jobId,
      data.candidateId,
      new Date(),
      new Date(),
      ApplicationStatus.PENDIENTE,
    );

    return this.applicationRepository.create(application);
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
}

import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IJobRepository } from '../repositories/job.repository';
import { IOrganizationRepository } from '../repositories/organization.repository';
import { IJobUseCase, CreateJobInput } from '../use-cases/job/job.use-case';
import {
  Job,
  JobStatus,
  JobEmploymentType,
  JobExperienceLevel,
  JobBenefits,
  JobSalary,
  JobLocation,
} from '../domain/entities/job.entity';

@Injectable()
export class JobService implements IJobUseCase {
  constructor(
    @Inject('IJobRepository')
    private readonly jobRepository: IJobRepository,
    @Inject('IOrganizationRepository')
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createJob(data: CreateJobInput): Promise<Job> {
    const organization = await this.organizationRepository.findById(
      data.organizationId,
    );
    if (!organization) {
      throw new NotFoundException(
        `Organization with id ${data.organizationId} not found`,
      );
    }

    const job = new Job(
      this.generateId(),
      data.organizationId,
      data.title,
      data.description,
      data.employmentType as JobEmploymentType,
      data.experienceLevel as JobExperienceLevel,
      this.mapBenefits(data.benefits),
      new Date(),
      new Date(),
      this.mapSalary(data.salary),
      (data.status as JobStatus) || JobStatus.DRAFT,
      data.applicationsCount || 0,
      data.expiresAt,
      this.mapLocation(data.location),
    );

    return this.jobRepository.create(job);
  }

  async getJobById(id: string): Promise<Job | null> {
    return this.jobRepository.findById(id);
  }

  async getAllJobs(filters?: any, pagination?: any): Promise<any> {
    return this.jobRepository.findAll(filters, pagination);
  }

  async getJobsByOrganizationId(
    organizationId: string,
    pagination?: any,
  ): Promise<any> {
    return this.jobRepository.findByOrganizationId(organizationId, pagination);
  }

  async getJobByIdWithApplications(id: string): Promise<any> {
    return this.jobRepository.findByIdWithApplications(id);
  }

  async getAllJobsWithApplicationCounts(
    organizationId: string,
    pagination?: any,
  ): Promise<any> {
    return this.jobRepository.findAllWithApplicationCounts(
      organizationId,
      pagination,
    );
  }

  async updateJob(
    id: string,
    data: Partial<CreateJobInput>,
  ): Promise<Job | null> {
    const existingJob = await this.jobRepository.findById(id);
    if (!existingJob) {
      throw new NotFoundException(`Job with id ${id} not found`);
    }

    const updatedJob: Partial<Job> = {
      ...existingJob,
      title: data.title ?? existingJob.title,
      description: data.description ?? existingJob.description,
      employmentType: data.employmentType
        ? (data.employmentType as JobEmploymentType)
        : existingJob.employmentType,
      experienceLevel: data.experienceLevel
        ? (data.experienceLevel as JobExperienceLevel)
        : existingJob.experienceLevel,
      salary: this.mapSalary(data.salary) ?? existingJob.salary,
      location: this.mapLocation(data.location) ?? existingJob.location,
      benefits: this.mapBenefits(data.benefits) ?? existingJob.benefits,
      status: data.status ? (data.status as JobStatus) : existingJob.status,
      applicationsCount:
        data.applicationsCount ?? existingJob.applicationsCount,
      expiresAt: data.expiresAt,
    };

    return this.jobRepository.update(id, updatedJob);
  }

  async deleteJob(id: string): Promise<boolean> {
    const existingJob = await this.jobRepository.findById(id);
    if (!existingJob) {
      throw new NotFoundException(`Job with id ${id} not found`);
    }

    return this.jobRepository.delete(id);
  }

  private mapBenefits(
    data: Record<string, unknown>[] | undefined,
  ): JobBenefits[] {
    if (!data) return [];
    return data.map(b => ({
      tipo: (b.tipo as string) || '',
      title: (b.title as string) || '',
    }));
  }

  private mapSalary(data: Record<string, unknown> | undefined): JobSalary {
    if (!data) return {};
    return {
      min: data.min as number | undefined,
      max: data.max as number | undefined,
      currency: data.currency as string | undefined,
      period: data.period as string | undefined,
      isNegotiable: data.isNegotiable as boolean | undefined,
    };
  }

  private mapLocation(data: Record<string, unknown> | undefined): JobLocation {
    if (!data) return {};
    return {
      city: data.city as string | undefined,
      state: data.state as string | undefined,
      country: data.country as string | undefined,
      isRemote: data.isRemote as boolean | undefined,
      isHybrid: data.isHybrid as boolean | undefined,
    };
  }
}

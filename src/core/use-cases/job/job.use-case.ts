import { Job } from '../../domain/entities/job.entity';

export interface JobFilters {
  organizationId?: string;
  status?: 'draft' | 'active' | 'paused' | 'closed' | 'expired';
  search?: string;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface JobWithApplications {
  job: Job;
  applicationsCount: number;
}

export interface IJobUseCase {
  createJob(data: CreateJobInput): Promise<Job>;
  getJobById(id: string): Promise<Job | null>;
  getAllJobs(
    filters?: JobFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Job>>;
  getJobsByOrganizationId(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Job>>;
  getAllJobsWithApplicationCounts(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<JobWithApplications>>;
  updateJob(id: string, data: UpdateJobInput): Promise<Job | null>;
  incrementJobViews(id: string): Promise<Job | null>;
  deleteJob(id: string): Promise<boolean>;
}

export interface CreateJobInput {
  organizationId: string;
  title: string;
  description: string;
  employmentType: string;
  experienceLevel: string;
  salary?: Record<string, unknown>;
  location?: Record<string, unknown>;
  benefits?: Record<string, unknown>[];
  status?: string;
  expiresAt?: Date;
}

export interface UpdateJobInput {
  title?: string;
  description?: string;
  employmentType?: string;
  experienceLevel?: string;
  salary?: Record<string, unknown>;
  location?: Record<string, unknown>;
  benefits?: Record<string, unknown>[];
  status?: string;
  expiresAt?: Date;
}

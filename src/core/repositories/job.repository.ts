import { Job } from '../domain/entities/index';

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

export interface IJobRepository {
  create(entity: Job): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  findAll(
    filters?: JobFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Job>>;
  findByOrganizationId(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Job>>;
  findByIdWithApplications(id: string): Promise<JobWithApplications | null>;
  findAllWithApplicationCounts(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<JobWithApplications>>;
  update(id: string, entity: Partial<Job>): Promise<Job | null>;
  incrementViews(id: string): Promise<Job | null>;
  delete(id: string): Promise<boolean>;
}

export interface JobWithApplications {
  job: Job;
  applicationsCount: number;
}

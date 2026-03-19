export interface SavedJobFilters {
  userId?: string;
  jobId?: string;
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

export interface ISavedJobRepository {
  create(entity: import('../../core/domain/entities/saved-job.entity').SavedJob): Promise<import('../../core/domain/entities/saved-job.entity').SavedJob>;
  findById(id: string): Promise<import('../../core/domain/entities/saved-job.entity').SavedJob | null>;
  findByUserAndJob(userId: string, jobId: string): Promise<import('../../core/domain/entities/saved-job.entity').SavedJob | null>;
  findByUserId(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<import('../../core/domain/entities/saved-job.entity').SavedJob>>;
  findByJobId(jobId: string, pagination?: PaginationOptions): Promise<PaginatedResult<import('../../core/domain/entities/saved-job.entity').SavedJob>>;
  delete(id: string): Promise<boolean>;
  deleteByUserAndJob(userId: string, jobId: string): Promise<boolean>;
}

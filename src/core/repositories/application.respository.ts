import { Application } from '../domain/entities/application.entity';

export interface ApplicationFilters {
  jobId?: string;
  candidateId?: string;
  status?: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';
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

export interface IApplicationRepository {
  create(entity: Application): Promise<Application>;
  findById(id: string): Promise<Application | null>;
  findByJobAndCandidate(
    jobId: string,
    candidateId: string,
  ): Promise<Application | null>;
  findAll(
    filters?: ApplicationFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  findByJobId(
    jobId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  findByCandidateId(
    candidateId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  findByOrganizationId(
    organizationId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  update(id: string, entity: Partial<Application>): Promise<Application | null>;
  delete(id: string): Promise<boolean>;
}

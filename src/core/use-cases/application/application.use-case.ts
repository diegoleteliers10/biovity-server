import { Application, ApplicationStatus } from '../../domain/entities/application.entity';

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

export interface IApplicationUseCase {
  createApplication(data: CreateApplicationInput): Promise<Application>;
  getApplicationById(id: string): Promise<Application | null>;
  getApplicationsByJobId(
    jobId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  getApplicationsByCandidateId(
    candidateId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  updateApplicationStatus(
    id: string,
    status: ApplicationStatus,
  ): Promise<Application | null>;
  deleteApplication(id: string): Promise<boolean>;
  checkExistingApplication(
    jobId: string,
    candidateId: string,
  ): Promise<boolean>;
}

export interface CreateApplicationInput {
  jobId: string;
  candidateId: string;
}

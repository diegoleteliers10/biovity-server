import { Application } from '../../domain/entities/application.entity';
import { ApplicationStatus } from '../../domain/enums';
import type { ApplicationSourceChannel } from '../../domain/application-source';

export interface ApplicationFilters {
  jobId?: string;
  candidateId?: string;
  status?:
    | 'pendiente'
    | 'oferta'
    | 'entrevista'
    | 'rechazado'
    | 'contratado'
    | 'desistido';
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
  createApplication(data: CreateApplicationInput): Promise<Application | null>;
  getApplicationById(id: string): Promise<Application | null>;
  getApplicationsByJobId(
    jobId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  getApplicationsByCandidateId(
    candidateId: string,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<Application>>;
  updateApplicationStatus(input: {
    applicationId: string;
    status: ApplicationStatus;
    changedById: string | null;
    rejectionNote?: string;
    rejectionReasonId?: string;
  }): Promise<Application | null>;
  deleteApplication(id: string): Promise<boolean>;
  checkExistingApplication(
    jobId: string,
    candidateId: string,
  ): Promise<boolean>;
}

export interface CreateApplicationInput {
  jobId: string;
  candidateId: string;
  coverLetter?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  availabilityDate?: string;
  resumeUrl?: string;
  sourceChannel?: Exclude<ApplicationSourceChannel, 'unknown'>;
  distributionSourceId?: string;
  answers?: { questionId: string; value: string }[];
}

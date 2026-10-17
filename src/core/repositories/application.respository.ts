import { Application } from '../domain/entities/application.entity';

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

export type ApplicationStatusHistoryItem = {
  id: string;
  previousStatus: string | null;
  newStatus: string;
  changedAt: Date;
  changedById: string | null;
  changedByName: string | null;
  rejectionNote: string | null;
  rejectionReasonId: string | null;
  rejectionReasonSnapshot: string | null;
  previousStageId: string | null;
  newStageId: string | null;
  previousStageName: string | null;
  newStageName: string | null;
  transitionKind: 'stage' | 'reopen';
  transitionNote: string | null;
};

export type UpdateApplicationStatusInput = {
  id: string;
  status: Application['status'];
  changedById: string | null;
  rejectionNote: string | null;
  rejectionReasonId?: string | null;
};

export type UpdateApplicationStageInput = {
  id: string;
  stageId: string;
  changedById: string | null;
  rejectionNote: string | null;
  rejectionReasonId?: string | null;
};

export type ReopenApplicationInput = {
  id: string;
  stageId: string;
  changedById: string | null;
  reason: string;
};

export type UpdateApplicationHiringPlanInput = {
  id: string;
  assigneeId?: string | null;
  nextAction?: string | null;
  targetDate?: string | null;
};

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
  update(input: UpdateApplicationStatusInput): Promise<Application | null>;
  transitionStage(
    input: UpdateApplicationStageInput,
  ): Promise<Application | null>;
  reopen(input: ReopenApplicationInput): Promise<Application | null>;
  updateHiringPlan(
    input: UpdateApplicationHiringPlanInput,
  ): Promise<Application | null>;
  findStatusHistoryByApplicationId(
    applicationId: string,
  ): Promise<ApplicationStatusHistoryItem[]>;
  delete(id: string): Promise<boolean>;
}

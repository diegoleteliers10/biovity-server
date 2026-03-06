import { Job } from '../../domain/entities/job.entity';

export interface IJobUseCase {
  createJob(data: CreateJobInput): Promise<Job>;
  getJobById(id: string): Promise<Job | null>;
  getAllJobs(): Promise<Job[]>;
  updateJob(id: string, data: UpdateJobInput): Promise<Job | null>;
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
  applicationsCount?: number;
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
  applicationsCount?: number;
  expiresAt?: Date;
}

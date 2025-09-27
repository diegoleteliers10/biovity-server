import { JobPost } from '../domain/entities/index';

export interface IJobPostRepository {
  create(entity: JobPost): Promise<JobPost>;
  findById(id: string): Promise<JobPost | null>;
  findAll(): Promise<JobPost[]>;
  update(id: string, entity: Partial<JobPost>): Promise<JobPost | null>;
  delete(id: string): Promise<boolean>;
}

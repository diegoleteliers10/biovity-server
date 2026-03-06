import { Job } from '../domain/entities/index';

export interface IJobRepository {
  create(entity: Job): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  findAll(): Promise<Job[]>;
  update(id: string, entity: Partial<Job>): Promise<Job | null>;
  delete(id: string): Promise<boolean>;
}

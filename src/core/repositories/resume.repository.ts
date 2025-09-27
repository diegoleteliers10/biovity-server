import { Resume } from '../domain/entities/index';

export interface IResumeRepository {
  create(entity: Resume): Promise<Resume>;
  findById(id: string): Promise<Resume | null>;
  findAll(): Promise<Resume[]>;
  update(id: string, entity: Partial<Resume>): Promise<Resume | null>;
  delete(id: string): Promise<boolean>;
}

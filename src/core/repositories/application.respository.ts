import { Application } from '../domain/entities/application.entity';

export interface IApplicationRepository {
  create(entity: Application): Promise<Application>;
  findById(id: string): Promise<Application | null>;
  findAll(): Promise<Application[]>;
  update(id: string, entity: Partial<Application>): Promise<Application | null>;
  delete(id: string): Promise<boolean>;
}

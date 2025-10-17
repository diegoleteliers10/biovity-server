import { User } from '../domain/entities/index';

export interface IUserRepository {
  create(entity: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(): Promise<User[]>;
  update(id: string, entity: Partial<User>): Promise<User | null>;
  delete(id: string): Promise<boolean>;
  /** Verify user credentials without exposing password hashes */
  verifyUserCredentials(email: string, password: string): Promise<User | null>;
}

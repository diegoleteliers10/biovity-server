import { User } from '../domain/entities/index';
import { UserType } from '../domain/enums';

export interface UserFilters {
  type?: 'professional' | 'organization';
  isActive?: boolean;
  search?: string; // searches in name or email
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

export interface IUserRepository {
  create(entity: User): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAll(
    filters?: UserFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<User>>;
  findIdsByOrganizationId(
    organizationId: string,
    type?: UserType,
  ): Promise<string[]>;
  update(id: string, entity: Partial<User>): Promise<User | null>;
  incrementViews(id: string): Promise<User | null>;
  delete(id: string): Promise<boolean>;
}

import { User } from '../../domain/entities/user.entity';

export interface UserFilters {
  type?: 'professional' | 'organization';
  isEmailVerified?: boolean;
  isActive?: boolean;
  search?: string;
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

export interface IUserUseCase {
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getAllUsers(
    filters?: UserFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<User>>;
  updateUser(id: string, data: UpdateUserInput): Promise<User | null>;
}

export interface UpdateUserInput {
  name?: string;
  type?: string;
  isEmailVerified?: boolean;
  isActive?: boolean;
  organizationId?: string;
  avatar?: string;
  profession?: string;
  birthday?: string;
  phone?: string;
  location?: {
    city?: string;
    country?: string;
  };
}

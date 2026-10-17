import { User } from '../../domain/entities/user.entity';
import type {
  CandidateAvailability,
  CandidateSeniority,
  UserType,
} from '../../domain/enums';

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
  incrementViews(id: string): Promise<User | null>;
}

export interface UpdateUserInput {
  name?: string;
  type?: UserType;
  isEmailVerified?: boolean;
  isActive?: boolean;
  organizationId?: string;
  avatar?: string;
  profession?: string;
  experienceLevel?: CandidateSeniority | null;
  availability?: CandidateAvailability | null;
  birthday?: string;
  phone?: string;
  location?: {
    city?: string;
    country?: string;
  };
  notificationPreferences?: {
    digest?: 'none' | 'immediate' | 'daily' | 'weekly';
    channels?: {
      email?: boolean;
      in_app?: boolean;
    };
    events?: {
      application?: boolean;
      interview?: boolean;
      message?: boolean;
      job_alert?: boolean;
      system?: boolean;
    };
  };
}

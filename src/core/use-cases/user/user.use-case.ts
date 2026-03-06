import { User } from '../../domain/entities/user.entity';

export interface IUserUseCase {
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
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
}

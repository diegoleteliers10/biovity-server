import { Injectable, Inject } from '@nestjs/common';
import {
  IUserRepository,
  UserFilters,
  PaginationOptions,
  PaginatedResult,
} from '../repositories/user.repository';
import { IUserUseCase, UpdateUserInput } from '../use-cases/user/user.use-case';
import { User } from '../domain/entities/user.entity';

@Injectable()
export class UserService implements IUserUseCase {
  constructor(
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  async getUserById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return this.userRepository.findByEmail(email);
  }

  async getAllUsers(
    filters?: UserFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<User>> {
    return this.userRepository.findAll(filters, pagination);
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User | null> {
    return this.userRepository.update(id, data);
  }

  async incrementViews(id: string): Promise<User | null> {
    return this.userRepository.incrementViews(id);
  }
}

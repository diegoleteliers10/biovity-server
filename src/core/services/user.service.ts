import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import { IUserRepository } from '../repositories/user.repository';
import { IUserUseCase, UpdateUserInput } from '../use-cases/user/user.use-case';
import { User, UserType } from '../domain/entities/user.entity';

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

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.findAll();
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<User | null> {
    const existingUser = await this.userRepository.findById(id);
    if (!existingUser) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    const updatedUser: Partial<User> = {
      ...existingUser,
      name: data.name ?? existingUser.name,
      type: data.type ? (data.type as UserType) : existingUser.type,
      isEmailVerified: data.isEmailVerified ?? existingUser.isEmailVerified,
      isActive: data.isActive ?? existingUser.isActive,
      organizationId: data.organizationId ?? existingUser.organizationId,
      avatar: data.avatar ?? existingUser.avatar,
      profession: data.profession ?? existingUser.profession,
    };

    return this.userRepository.update(id, updatedUser);
  }
}

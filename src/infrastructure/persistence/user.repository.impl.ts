import { IUserRepository } from '../../core/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { User } from '../../core/domain/entities/user.entity';
import { UserDomainOrmMapper } from '../../shared/mappers/user/userDomain-orm.mapper';
import {
  UserFilters,
  PaginationOptions,
  PaginatedResult,
} from '../../core/repositories/user.repository';

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(entity: User): Promise<User> {
    const userOrm = UserDomainOrmMapper.toOrm(entity);
    const savedUser = await this.userRepository.save(userOrm);
    return UserDomainOrmMapper.toDomain(savedUser);
  }

  async findById(id: string): Promise<User | null> {
    const userOrm = await this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    return userOrm ? UserDomainOrmMapper.toDomain(userOrm) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userOrm = await this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });
    return userOrm ? UserDomainOrmMapper.toDomain(userOrm) : null;
  }

  async findAll(
    filters?: UserFilters,
    pagination?: PaginationOptions,
  ): Promise<PaginatedResult<User>> {
    const page = pagination?.page || 1;
    const limit = pagination?.limit || 10;
    const skip = (page - 1) * limit;

    // Build query builder
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.organization', 'organization');

    // Apply filters
    if (filters?.type) {
      queryBuilder.andWhere('user.type = :type', { type: filters.type });
    }

    if (filters?.isActive !== undefined) {
      queryBuilder.andWhere('user.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters?.search) {
      queryBuilder.andWhere(
        '(user.name ILIKE :search OR user.email ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    // Get total count
    const total = await queryBuilder.getCount();

    // Apply pagination
    queryBuilder.skip(skip).take(limit).orderBy('user.createdAt', 'DESC');

    const usersOrm = await queryBuilder.getMany();
    const data = usersOrm.map(userOrm => UserDomainOrmMapper.toDomain(userOrm));

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async update(id: string, entity: Partial<User>): Promise<User | null> {
    const existingUser = await this.userRepository.findOne({ where: { id } });
    if (!existingUser) return null;

    const updatedUserOrm = {
      ...existingUser,
      ...UserDomainOrmMapper.toOrm(entity as User),
    };
    const savedUser = await this.userRepository.save(updatedUserOrm);
    return UserDomainOrmMapper.toDomain(savedUser);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

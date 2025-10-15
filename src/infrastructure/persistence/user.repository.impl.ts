import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { IUserRepository } from '../../core/repositories/user.repository';
import { User } from '../../core/domain/entities/user.entity';
import { UserEntity } from '../database/orm/user.entity';
import { UserMapper } from '../../shared/mappers/user.mapper';

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async create(entity: User): Promise<User> {
    const userEntity = UserMapper.toEntity(entity);
    const savedEntity = await this.userRepository.save(userEntity);
    return UserMapper.toDomain(savedEntity);
  }

  async findById(id: string): Promise<User | null> {
    const userEntity = await this.userRepository.findOne({
      where: { id },
      relations: ['organization'],
    });
    return userEntity ? UserMapper.toDomain(userEntity) : null;
  }

  async findAll(): Promise<User[]> {
    const userEntities = await this.userRepository.find({
      relations: ['organization'],
    });
    return userEntities.map(entity => UserMapper.toDomain(entity));
  }

  async update(id: string, entity: Partial<User>): Promise<User | null> {
    const existingEntity = await this.userRepository.findOne({
      where: { id },
    });

    if (!existingEntity) {
      return null;
    }

    const updatedEntity = { ...existingEntity, ...entity };
    const savedEntity = await this.userRepository.save(updatedEntity);
    return UserMapper.toDomain(savedEntity);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.userRepository.delete(id);
    return result.affected ? result.affected > 0 : false;
  }
}

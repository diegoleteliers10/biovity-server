import { IUserRepository } from '../../core/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../core/domain/entities/user.entity';
import { UserDomainOrmMapper } from '../../shared/mappers/user/userDomain-orm.mapper';
import * as bcrypt from 'bcrypt';

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

  async findAll(): Promise<User[]> {
    const usersOrm = await this.userRepository.find({
      relations: ['organization'],
    });
    return usersOrm.map(userOrm => UserDomainOrmMapper.toDomain(userOrm));
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

  async verifyUserCredentials(
    email: string,
    password: string,
  ): Promise<User | null> {
    const userOrm = await this.userRepository.findOne({
      where: { email },
      relations: ['organization'],
    });

    if (!userOrm || !(await bcrypt.compare(password, userOrm.password))) {
      return null;
    }

    return UserDomainOrmMapper.toDomain(userOrm);
  }
}

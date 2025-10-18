import { IUserRepository } from '../../core/repositories/user.repository';
import { Injectable } from '@nestjs/common';
import { UserEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../core/domain/entities/user.entity';

@Injectable()
export class UserRepositoryImpl implements IUserRepository {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  // async create(entity: User): Promise<User> {
  // }
}

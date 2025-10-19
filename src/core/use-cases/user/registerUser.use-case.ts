import { Injectable } from '@nestjs/common';
import { IUserRepository } from '../../repositories/user.repository';
// import { UserResponseDto } from '../../../interfaces/dtos/user/user-response.dto';
// import { UserOrmDtoMapper } from '../../../shared/mappers/user/userOrm-dto.mapper';
// import { User } from '../../domain/entities';

@Injectable()
export class CreateUserUseCase {
  constructor(private readonly userRepository: IUserRepository) {}

  // async execute(input: User): Promise<UserResponseDto> {
  //   if (!input.email) {
  //     throw new Error('Email is required');
  //   }

  //   if (!input.password) {
  //     throw new Error('Password is required');
  //   }

  //   // Additional validation can be added here

  //   const user = await this.userRepository.create(input);
  //   return UserOrmDtoMapper.toDto(user);
  // }
}

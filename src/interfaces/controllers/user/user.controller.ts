import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserService } from '../../../core/services/user.service';
import { UserDtoDomainMapper } from '../../../shared/mappers/user/userDto-domain.mapper';
import { UserUpdateDto } from '../../dtos/user/user-update.dto';
import { UserResponseDto } from '../../dtos/user/user-response.dto';
import { UserDomainDtoMapper } from '../../../shared/mappers/user/userDomain-dto.mapper';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.userService.getUserById(id);
    return user ? UserDomainDtoMapper.toDto(user) : null;
  }

  @Get('email/:email')
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<UserResponseDto | null> {
    const user = await this.userService.getUserByEmail(email);
    return user ? UserDomainDtoMapper.toDto(user) : null;
  }

  @Get()
  async getAllUsers(): Promise<UserResponseDto[]> {
    const users = await this.userService.getAllUsers();
    return users.map(user => UserDomainDtoMapper.toDto(user));
  }

  @Put(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UserUpdateDto,
  ): Promise<UserResponseDto | null> {
    const input = UserDtoDomainMapper.toUpdateUserInput(dto);
    const user = await this.userService.updateUser(id, input);
    return user ? UserDomainDtoMapper.toDto(user) : null;
  }
}

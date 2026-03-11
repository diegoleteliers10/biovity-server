import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import { UserService } from '../../../core/services/user.service';
import { UserDtoDomainMapper } from '../../../shared/mappers/user/userDto-domain.mapper';
import { UserUpdateDto } from '../../dtos/user/user-update.dto';
import { UserResponseDto } from '../../dtos/user/user-response.dto';
import { UserDomainDtoMapper } from '../../../shared/mappers/user/userDomain-dto.mapper';
import { UserQueryDto } from '../../dtos/user/user-query.dto';
import { UserPaginatedResponseDto } from '../../dtos/user/user-paginated.dto';

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
  async getAllUsers(
    @Query() query: UserQueryDto,
  ): Promise<UserPaginatedResponseDto> {
    const filters = {
      type: query.type,
      isActive: query.isActive,
      search: query.search,
    };

    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.userService.getAllUsers(filters, pagination);

    return {
      data: result.data.map(user => UserDomainDtoMapper.toDto(user)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
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

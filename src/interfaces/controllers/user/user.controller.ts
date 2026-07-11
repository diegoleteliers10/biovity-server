import {
  Controller,
  Get,
  Put,
  Patch,
  Post,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from '../../../core/services/user.service';
import { UserDtoDomainMapper } from '../../../shared/mappers/user/userDto-domain.mapper';
import { UserUpdateDto, UserNotificationPreferencesDto } from '../../dtos/user/user-update.dto';
import { UserResponseDto } from '../../dtos/user/user-response.dto';
import { UserDomainDtoMapper } from '../../../shared/mappers/user/userDomain-dto.mapper';
import { UserQueryDto } from '../../dtos/user/user-query.dto';
import { UserPaginatedResponseDto } from '../../dtos/user/user-paginated.dto';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserResponseDto> {
    const user = await this.userService.getUserById(id);
    if (!user) throw new NotFoundException('User not found');
    return UserDomainDtoMapper.toDto(user);
  }

  @Get('email/:email')
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<UserResponseDto> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    return UserDomainDtoMapper.toDto(user);
  }

  @Get()
  async getAllUsers(
    @Query() query: UserQueryDto,
  ): Promise<UserPaginatedResponseDto> {
    const filters = {
      type: query.type,
      isActive: query.isActive,
      search: query.search,
      // F8.1 — Filtros faceted
      profession: query.profession,
      experienceLevel: query.experienceLevel,
      city: query.city,
      country: query.country,
      availability: query.availability,
      skills: query.skills ? query.skills.split(',').map(s => s.trim()).filter(Boolean) : undefined,
      minExperience: query.minExperience,
      maxExperience: query.maxExperience,
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
  ): Promise<UserResponseDto> {
    const input = UserDtoDomainMapper.toUpdateUserInput(dto);
    const user = await this.userService.updateUser(id, input);
    if (!user) throw new NotFoundException('User not found');
    return UserDomainDtoMapper.toDto(user);
  }

  @Patch(':id/notification-preferences')
  @HttpCode(HttpStatus.OK)
  async updateNotificationPreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UserNotificationPreferencesDto,
  ): Promise<UserResponseDto> {
    const user = await this.userService.updateUser(id, {
      notificationPreferences: dto as any,
    });
    if (!user) throw new NotFoundException('User not found');
    return UserDomainDtoMapper.toDto(user);
  }

  @Post(':id/views')
  @HttpCode(HttpStatus.OK)
  async incrementViews(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<{ views: number }> {
    const user = await this.userService.incrementViews(id);
    return { views: user?.profileViews ?? 0 };
  }
}

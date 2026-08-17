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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserService } from '../../../core/services/user.service';
import { UserDtoDomainMapper } from '../../../shared/mappers/user/userDto-domain.mapper';
import {
  UserUpdateDto,
  UserNotificationPreferencesDto,
} from '../../dtos/user/user-update.dto';
import { UserResponseDto } from '../../dtos/user/user-response.dto';
import { UserQueryDto } from '../../dtos/user/user-query.dto';
import { UserPaginatedResponseDto } from '../../dtos/user/user-paginated.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { isAdminUser } from '../../../shared/auth/better-auth-session.service';
import {
  assertCanReadUser,
  AccessLevel,
} from '../../../shared/auth/user-access.policy';
import { UserAccessMapper } from '../../../shared/mappers/user/userAccess-dto.mapper';
import type { UserAccessLevel } from '../../../shared/auth/user-access.policy';

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserResponseDto> {
    const user = await this.userService.getUserById(id);
    if (!user) throw new NotFoundException('User not found');
    const level = assertCanReadUser(requester, user.type, user.id);
    return UserAccessMapper.toDto(user, level);
  }

  @Get('email/:email')
  async getUserByEmail(
    @Param('email') email: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserResponseDto> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    const level = assertCanReadUser(requester, user.type, user.id);
    return UserAccessMapper.toDto(user, level);
  }

  @Get()
  async getAllUsers(
    @Query() query: UserQueryDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserPaginatedResponseDto> {
    const level = this.assertCanListUsers(requester);
    const filters = {
      type: this.resolveListType(requester, query.type),
      isActive: query.isActive,
      search: query.search,
      // F8.1 — Filtros faceted
      profession: query.profession,
      experienceLevel: query.experienceLevel,
      city: query.city,
      country: query.country,
      availability: query.availability,
      skills: query.skills
        ? query.skills
            .split(',')
            .map(s => s.trim())
            .filter(Boolean)
        : undefined,
      minExperience: query.minExperience,
      maxExperience: query.maxExperience,
    };

    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.userService.getAllUsers(filters, pagination);

    return {
      data: result.data.map(user => UserAccessMapper.toDto(user, level)),
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
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserResponseDto> {
    this.assertCanMutateUser(requester, id);
    const input = UserDtoDomainMapper.toUpdateUserInput(dto);
    const user = await this.userService.updateUser(id, input);
    if (!user) throw new NotFoundException('User not found');
    return UserAccessMapper.toDto(user, AccessLevel.FULL);
  }

  @Patch('me/notification-preferences')
  @HttpCode(HttpStatus.OK)
  async updateMyNotificationPreferences(
    @Body() dto: UserNotificationPreferencesDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserResponseDto> {
    if (!requester) throw new ForbiddenException('No autenticado');
    const user = await this.userService.updateUser(requester.id, {
      notificationPreferences: dto,
    });
    if (!user) throw new NotFoundException('User not found');
    return UserAccessMapper.toDto(user, AccessLevel.FULL);
  }

  @Patch(':id/notification-preferences')
  @HttpCode(HttpStatus.OK)
  async updateNotificationPreferences(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UserNotificationPreferencesDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserResponseDto> {
    this.assertCanMutateUser(requester, id);
    const user = await this.userService.updateUser(id, {
      notificationPreferences: dto,
    });
    if (!user) throw new NotFoundException('User not found');
    return UserAccessMapper.toDto(user, AccessLevel.FULL);
  }

  @Post(':id/views')
  @HttpCode(HttpStatus.OK)
  async incrementViews(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<{ views: number }> {
    const user = await this.userService.incrementViews(id);
    if (user) assertCanReadUser(requester, user.type, id);
    return { views: user?.profileViews ?? 0 };
  }

  private assertCanListUsers(
    requester: AuthenticatedUser | undefined,
  ): UserAccessLevel {
    if (!requester) return AccessLevel.FULL;
    if (isAdminUser(requester)) return AccessLevel.BASIC;
    if (requester.type === 'organization') {
      return AccessLevel.FULL;
    }
    throw new ForbiddenException('No tienes permisos para listar usuarios');
  }

  private resolveListType(
    requester: AuthenticatedUser | undefined,
    requestedType: string | undefined,
  ): 'professional' | 'organization' | undefined {
    if (!requester || isAdminUser(requester)) {
      return requestedType as 'professional' | 'organization' | undefined;
    }
    // Organizations can only list professionals (no org-to-org reads).
    return 'professional' as const;
  }

  private assertCanMutateUser(
    requester: AuthenticatedUser | undefined,
    targetId: string,
  ): void {
    if (!requester) return;
    if (requester.id === targetId) return;
    if (isAdminUser(requester)) return;
    throw new ForbiddenException(
      'No tienes permisos para modificar este usuario',
    );
  }
}

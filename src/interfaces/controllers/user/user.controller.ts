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
import { Throttle } from '@nestjs/throttler';
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
import type { UserSort } from '../../../core/repositories/user.repository';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  THROTTLE_SENSITIVE_LIMIT,
  THROTTLE_TTL_MS,
} from '../../../shared/constants/throttling';

const USER_SORT_FIELDS = ['createdat', 'name'] as const;

function parseUserSort(raw: string | undefined): UserSort | undefined {
  if (!raw) return undefined;
  const [field, direction = 'desc'] = raw.split(':');
  const normalizedField = field.trim().toLowerCase();
  const normalizedDirection = direction.trim().toLowerCase();
  if (
    !USER_SORT_FIELDS.some(f => f === normalizedField) ||
    (normalizedDirection !== 'asc' && normalizedDirection !== 'desc')
  ) {
    return undefined;
  }
  return {
    field: normalizedField === 'name' ? 'name' : 'createdAt',
    direction: normalizedDirection === 'asc' ? 'ASC' : 'DESC',
  };
}

@ApiTags('users')
@Controller('users')
export class UserController {
  constructor(
    private readonly userService: UserService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserResponseDto> {
    const user = await this.userService.getUserById(id);
    if (!user) throw new NotFoundException('User not found');
    const level = await this.resolveReadLevel(requester, user.type, user.id);
    return UserAccessMapper.toDto(user, level);
  }

  @Get('email/:email')
  async getUserByEmail(
    @Param('email') email: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserResponseDto> {
    const user = await this.userService.getUserByEmail(email);
    if (!user) throw new NotFoundException('User not found');
    const level = await this.resolveReadLevel(requester, user.type, user.id);
    return UserAccessMapper.toDto(user, level);
  }

  @Get()
  async getAllUsers(
    @Query() query: UserQueryDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<UserPaginatedResponseDto> {
    const level = await this.assertCanListUsers(requester);
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
      sort: parseUserSort(query.sort),
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
    const input =
      requester && (isAdminUser(requester) || requester.type === 'admin')
        ? UserDtoDomainMapper.toUpdateUserInput(dto)
        : {
            name: dto.name,
            avatar: dto.avatar,
            profession: dto.profession,
            birthday: dto.birthday,
            phone: dto.phone,
            location: dto.location,
            notificationPreferences: dto.notificationPreferences,
          };
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
  @Throttle({
    default: { limit: THROTTLE_SENSITIVE_LIMIT, ttl: THROTTLE_TTL_MS },
  })
  @HttpCode(HttpStatus.OK)
  async incrementViews(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<{ views: number }> {
    if (!requester) {
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    }
    if (requester.type === 'organization') {
      await this.assertOrganizationReadAccess(requester);
    }
    if (
      requester.id !== id &&
      !isAdminUser(requester) &&
      requester.type !== 'admin'
    ) {
      const target = await this.userService.getUserById(id);
      if (!target) throw new NotFoundException('User not found');
      await this.resolveReadLevel(requester, target.type, id);
    }
    const user = await this.userService.incrementViews(id);
    return { views: user?.profileViews ?? 0 };
  }

  private async assertCanListUsers(
    requester: AuthenticatedUser | undefined,
  ): Promise<UserAccessLevel> {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    if (isAdminUser(requester)) return AccessLevel.BASIC;
    if (requester.type === 'organization') {
      await this.assertOrganizationReadAccess(requester);
      return AccessLevel.DIRECTORY;
    }
    throw new ForbiddenException('No tienes permisos para listar usuarios');
  }

  private resolveListType(
    requester: AuthenticatedUser | undefined,
    requestedType: string | undefined,
  ): 'professional' | 'organization' | undefined {
    if (requester && (isAdminUser(requester) || requester.type === 'admin')) {
      return requestedType as 'professional' | 'organization' | undefined;
    }
    // Organizations can only list professionals (no org-to-org reads).
    return 'professional' as const;
  }

  private async resolveReadLevel(
    requester: AuthenticatedUser | undefined,
    targetType: string,
    targetId: string,
  ): Promise<UserAccessLevel> {
    const level = assertCanReadUser(requester, targetType, targetId);
    if (level !== AccessLevel.DIRECTORY || requester?.type !== 'organization') {
      return level;
    }
    const organizationId = await this.assertOrganizationReadAccess(requester);
    const hasRelationship =
      await this.organizationAccess.hasCandidateRelationship(
        organizationId,
        targetId,
      );
    return hasRelationship
      ? AccessLevel.RECRUITER_CONTACT
      : AccessLevel.DIRECTORY;
  }

  private async assertOrganizationReadAccess(
    requester: AuthenticatedUser,
  ): Promise<string> {
    if (!requester.organizationId) {
      throw new ForbiddenException(
        'La cuenta no pertenece a una organización.',
      );
    }
    await this.organizationAccess.assertAccess(
      requester.organizationId,
      requester,
      'read',
    );
    return requester.organizationId;
  }

  private assertCanMutateUser(
    requester: AuthenticatedUser | undefined,
    targetId: string,
  ): void {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    if (requester.id === targetId) return;
    if (isAdminUser(requester)) return;
    throw new ForbiddenException(
      'No tienes permisos para modificar este usuario',
    );
  }
}

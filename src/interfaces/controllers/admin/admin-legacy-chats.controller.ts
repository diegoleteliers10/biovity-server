import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminLegacyChatsService } from '../../../core/services/admin-legacy-chats.service';
import { resolveUserRole } from '../../../shared/auth/better-auth-session.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import {
  AdminLegacyChatsQueryDto,
  AssignLegacyChatOrganizationDto,
} from '../../dtos/admin/admin-legacy-chats.dto';

@ApiTags('admin-legacy-chats')
@Roles('admin')
@Controller('admin/legacy-chats')
export class AdminLegacyChatsController {
  constructor(private readonly legacyChats: AdminLegacyChatsService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List unassigned chats for admin review' })
  async list(
    @Query() query: AdminLegacyChatsQueryDto,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    await this.requireAdmin(actor);
    return this.legacyChats.list(query);
  }

  @Get('verified-organizations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List verified organizations for chat assignment' })
  async listVerifiedOrganizations(
    @Query() query: AdminLegacyChatsQueryDto,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    await this.requireAdmin(actor);
    return this.legacyChats.listVerifiedOrganizations(query);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Read an unassigned chat for admin review' })
  async get(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    await this.requireAdmin(actor);
    return this.legacyChats.get(id);
  }

  @Patch(':id/organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign a verified organization to an unassigned chat' })
  async assignOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() input: AssignLegacyChatOrganizationDto,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const authenticatedAdmin = await this.requireAdmin(actor);
    return this.legacyChats.assign({
      chatId: id,
      organizationId: input.organizationId,
      actorId: authenticatedAdmin.id,
    });
  }

  private requireAdmin(actor: AuthenticatedUser | undefined): Promise<AuthenticatedUser> {
    if (!actor) return Promise.reject(new UnauthorizedException());
    if (resolveUserRole(actor) !== 'admin') {
      return Promise.reject(new ForbiddenException('Admin access is required'));
    }
    return Promise.resolve(actor);
  }
}

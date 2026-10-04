import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ActivityLogService } from '../../../core/services/activity-log.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

@ApiTags('activity-logs')
@Roles('organization')
@Controller('organizations/:organizationId/activity-logs')
export class ActivityLogController {
  constructor(
    private readonly service: ActivityLogService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Obtener historial de actividades de la organización',
  })
  @ApiParam({ name: 'organizationId', type: String })
  async findAll(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    return this.service.findByOrganization(organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar una actividad de auditoría' })
  @ApiParam({ name: 'organizationId', type: String })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body()
    dto: {
      userId: string;
      action: string;
      description: string;
      metadata?: Record<string, any>;
    },
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!dto.userId || !dto.action || !dto.description) {
      throw new BadRequestException(
        'userId, action y description son requeridos',
      );
    }
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'manage',
    );
    if (requester?.type !== 'admin' && dto.userId !== requester?.id) {
      throw new BadRequestException(
        'userId debe corresponder a la sesión actual.',
      );
    }
    return this.service.log({
      organizationId,
      userId: dto.userId,
      action: dto.action,
      description: dto.description,
      metadata: dto.metadata,
    });
  }
}

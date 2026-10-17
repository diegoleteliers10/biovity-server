import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationRejectionReasonService } from '../../../core/services/organization-rejection-reason.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  ApplicationRejectionReasonResponseDto,
  CreateApplicationRejectionReasonDto,
  UpdateApplicationRejectionReasonDto,
} from '../../dtos/application-rejection-reason.dto';

@ApiTags('application-rejection-reasons')
@Roles('organization')
@Controller('organizations/:organizationId/rejection-reasons')
export class ApplicationRejectionReasonController {
  constructor(
    private readonly service: OrganizationRejectionReasonService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  async list(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationRejectionReasonResponseDto[]> {
    await this.organizationAccess.assertAccess(organizationId, requester, 'read');
    return this.service.list(organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateApplicationRejectionReasonDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationRejectionReasonResponseDto> {
    await this.organizationAccess.assertAccess(organizationId, requester, 'manage');
    return this.service.create(organizationId, dto.label);
  }

  @Patch(':id')
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApplicationRejectionReasonDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationRejectionReasonResponseDto> {
    await this.organizationAccess.assertAccess(organizationId, requester, 'manage');
    return this.service.update(organizationId, id, dto);
  }
}

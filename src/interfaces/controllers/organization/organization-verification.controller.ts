import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { OrganizationVerificationService } from '../../../core/services/organization-verification.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  resolveUserRole,
  type AuthenticatedUser,
} from '../../../shared/auth/better-auth-session.service';
import {
  OrganizationVerificationDecisionDto,
  OrganizationVerificationSubmitDto,
} from '../../dtos/organization/organization-verification.dto';

@ApiTags('organization-verification')
@Controller()
export class OrganizationVerificationController {
  constructor(
    private readonly verification: OrganizationVerificationService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get('organizations/:id/verification')
  @Roles('organization')
  @ApiOperation({ summary: 'Consultar la verificación de la organización' })
  async getStatus(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    return this.verification.getOrganizationStatus(organizationId);
  }

  @Post('organizations/:id/verification')
  @Roles('organization')
  @ApiOperation({ summary: 'Enviar una solicitud de verificación' })
  async submit(
    @Param('id', ParseUUIDPipe) organizationId: string,
    @Body() input: OrganizationVerificationSubmitDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'manage',
    );
    return this.verification.submit(organizationId, input);
  }

  @Get('admin/organization-verification')
  @Roles('admin')
  @ApiOperation({ summary: 'Listar solicitudes de verificación pendientes' })
  listPending(@CurrentUser() requester: AuthenticatedUser | undefined) {
    if (!requester) return Promise.reject(new UnauthorizedException());
    if (resolveUserRole(requester) !== 'admin') {
      return Promise.reject(
        new ForbiddenException('Admin access is required'),
      );
    }
    return this.verification.listPending();
  }

  @Patch('admin/organization-verification/:id')
  @Roles('admin')
  @ApiOperation({ summary: 'Resolver una solicitud de verificación' })
  review(
    @Param('id', ParseUUIDPipe) requestId: string,
    @Body() input: OrganizationVerificationDecisionDto,
    @CurrentUser() reviewer: AuthenticatedUser | undefined,
  ) {
    if (!reviewer) return Promise.reject(new UnauthorizedException());
    return this.verification.review(
      requestId,
      reviewer.id,
      input.decision,
      input.reason,
    );
  }
}

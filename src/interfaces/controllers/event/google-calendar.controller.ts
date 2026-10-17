import {
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  ServiceUnavailableException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { GoogleCalendarService } from '../../../core/services/google-calendar.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';

@ApiTags('google-calendar')
@Controller('google-calendar')
export class GoogleCalendarController {
  constructor(
    private readonly googleCalendar: GoogleCalendarService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get('personal')
  @Roles('professional')
  async getPersonalStatus(
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    return this.googleCalendar.getStatus({ kind: 'user', id: requester.id });
  }

  @Post('personal/connect')
  @Roles('professional')
  async connectPersonal(
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const connection = await this.googleCalendar.startConnection(
      { kind: 'user', id: requester.id },
      requester.id,
    );
    if (!connection) {
      throw new ServiceUnavailableException(
        'Google Calendar OAuth no está configurado.',
      );
    }
    return connection;
  }

  @Delete('personal')
  @Roles('professional')
  async disconnectPersonal(
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    await this.googleCalendar.disconnect({ kind: 'user', id: requester.id });
    return { disconnected: true };
  }

  @Post('personal/sync')
  @Roles('professional')
  async syncPersonal(@CurrentUser() requester: AuthenticatedUser | undefined) {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const processed = await this.googleCalendar.syncUpcomingEvents({
      kind: 'user',
      id: requester.id,
    });
    return { processed };
  }

  @Get('organizations/:organizationId')
  @Roles('organization')
  async getOrganizationStatus(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    return this.googleCalendar.getStatus({
      kind: 'organization',
      id: organizationId,
    });
  }

  @Post('organizations/:organizationId/connect')
  @Roles('organization')
  async connectOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'manage',
    );
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const connection = await this.googleCalendar.startConnection(
      { kind: 'organization', id: organizationId },
      requester.id,
    );
    if (!connection) {
      throw new ServiceUnavailableException(
        'Google Calendar OAuth no está configurado.',
      );
    }
    return connection;
  }

  @Delete('organizations/:organizationId')
  @Roles('organization')
  async disconnectOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'manage',
    );
    await this.googleCalendar.disconnect({
      kind: 'organization',
      id: organizationId,
    });
    return { disconnected: true };
  }

  @Post('organizations/:organizationId/sync')
  @Roles('organization')
  async syncOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'manage',
    );
    const processed = await this.googleCalendar.syncUpcomingEvents({
      kind: 'organization',
      id: organizationId,
    });
    return { processed };
  }

  @Post('internal/retry')
  @UseGuards(InternalSecretGuard)
  async retryPendingSyncs() {
    await this.googleCalendar.retryPendingSyncs();
    return { accepted: true };
  }

  @Get('oauth/callback')
  @Public()
  async oauthCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const status =
      code && state && !error
        ? await this.googleCalendar.finishConnection(code, state)
        : 'failed';
    const url = new URL(
      '/dashboard/profile',
      process.env.FRONTEND_APP_URL ?? 'https://biovity.cl',
    );
    url.searchParams.set('tab', 'calendar');
    url.searchParams.set('googleCalendar', status);
    url.hash = 'google-calendar';
    response.redirect(url.toString());
  }
}

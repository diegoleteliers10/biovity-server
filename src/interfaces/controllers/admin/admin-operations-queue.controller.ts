import {
  Body,
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  ParseUUIDPipe,
  Patch,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOperationsQueueService } from '../../../core/services/admin-operations-queue.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import {
  OperationsQueueQueryDto,
  UpdateOrganizationOnboardingAssignmentDto,
  UpdateAdminOperationsTaskAssignmentDto,
} from '../../dtos/admin/operations-queue.dto';
import { resolveUserRole } from '../../../shared/auth/better-auth-session.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';

@ApiTags('admin-operations-queue')
@Roles('admin')
@Controller('admin/operations-queue')
export class AdminOperationsQueueController {
  constructor(private readonly queue: AdminOperationsQueueService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar alertas operativos de empleo y selección' })
  async list(
    @Query() query: OperationsQueueQueryDto,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return this.queue.list(query, admin.id);
  }

  @Patch(':organizationId/assignment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tomar o liberar un caso de activación de empresa' })
  async updateAssignment(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() input: UpdateOrganizationOnboardingAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return this.queue.updateOnboardingAssignment({
      organizationId,
      adminUserId: admin.id,
      actorEmail: admin.email,
      action: input.action,
      nextAction: input.nextAction,
      targetDate: input.targetDate,
    });
  }

  @Patch(':kind/:sourceId/assignment')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Tomar, actualizar o liberar una tarea operativa' })
  async updateTaskAssignment(
    @Param('kind') kind: string,
    @Param('sourceId', ParseUUIDPipe) sourceId: string,
    @Body() input: UpdateAdminOperationsTaskAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    if (kind !== 'expired_job' && kind !== 'organization_without_active_jobs') {
      return Promise.reject(
        new BadRequestException('Unsupported operations queue task'),
      );
    }
    return this.queue.updateAdminTaskAssignment({
      kind,
      sourceId,
      adminUserId: admin.id,
      actorEmail: admin.email,
      action: input.action,
      nextAction: input.nextAction,
      targetDate: input.targetDate,
    });
  }

  @Post('offer-response-email/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar el aviso de respuesta a una oferta' })
  async retryOfferResponseEmail(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadOfferResponseEmail(intentId, admin.id),
    };
  }

  @Post('application-status-notification/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar un aviso de cambio de postulación' })
  async retryApplicationStatusNotification(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadApplicationStatusNotification(
        intentId,
        admin.id,
      ),
    };
  }

  @Post('application-created-notification/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar el aviso de nueva postulación' })
  async retryApplicationCreatedNotification(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadApplicationCreatedNotification(
        intentId,
        admin.id,
      ),
    };
  }

  @Post('event-change-notification/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar un aviso de cambio de entrevista' })
  async retryEventChangeNotification(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadEventChangeNotification(
        intentId,
        admin.id,
      ),
    };
  }

  @Post('event-lifecycle-notification/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar un aviso de evento' })
  async retryEventLifecycleNotification(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadEventLifecycleNotification(
        intentId,
        admin.id,
      ),
    };
  }

  @Post('message-notification/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar un aviso de mensaje' })
  async retryMessageNotification(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadMessageNotification(intentId, admin.id),
    };
  }

  @Post('interview-reminder-notification/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar un recordatorio de entrevista' })
  async retryInterviewReminderNotification(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadInterviewReminderNotification(
        intentId,
        admin.id,
      ),
    };
  }

  @Post('system-broadcast-notification/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar un aviso administrativo' })
  async retrySystemBroadcastNotification(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadSystemBroadcastNotification(
        intentId,
        admin.id,
      ),
    };
  }

  @Post('saved-search-alert/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar un aviso de búsqueda guardada' })
  async retrySavedSearchAlert(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryDeadSavedSearchAlertBucket(
        intentId,
        admin.id,
      ),
    };
  }

  @Post('saved-search-match/:intentId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar el matching de un perfil' })
  async retrySavedSearchMatch(
    @Param('intentId', ParseUUIDPipe) intentId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryFailedSavedSearchMatch(intentId, admin.id),
    };
  }

  @Post('ai-explanation/:revisionId/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reintentar una explicación de evaluación fallida' })
  async retryAiExplanation(
    @Param('revisionId', ParseUUIDPipe) revisionId: string,
    @CurrentUser() actor: AuthenticatedUser | undefined,
  ) {
    const admin = await this.requireAdmin(actor);
    return {
      status: await this.queue.retryFailedAiExplanation(revisionId, admin.id),
    };
  }

  private requireAdmin(
    actor: AuthenticatedUser | undefined,
  ): Promise<AuthenticatedUser> {
    if (!actor) return Promise.reject(new UnauthorizedException());
    if (resolveUserRole(actor) !== 'admin') {
      return Promise.reject(new ForbiddenException('Admin access is required'));
    }
    return Promise.resolve(actor);
  }
}

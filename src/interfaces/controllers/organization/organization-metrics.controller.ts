import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationMetricsService } from '../../../core/services/organization-metrics.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { OrganizationMetricsDto } from '../../dtos/organization/organization-metrics.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

@ApiTags('organizations')
@Roles('organization')
@Controller('organizations')
export class OrganizationMetricsController {
  constructor(
    private readonly metricsService: OrganizationMetricsService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get(':id/metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener métricas de una organización' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID de la organización',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'year', 'custom'],
    description: 'Período para las métricas (default: month)',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Fecha de inicio para rango personalizado (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Fecha de término para rango personalizado (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de la organización',
    type: OrganizationMetricsDto,
  })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async getMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: 'week' | 'month' | 'year' | 'custom',
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ): Promise<OrganizationMetricsDto> {
    await this.organizationAccess.assertAccess(id, requester, 'read');
    return this.metricsService.getMetrics(id, {
      period,
      startDate,
      endDate,
    });
  }
}

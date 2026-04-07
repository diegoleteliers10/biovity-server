import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { OrganizationMetricsService } from '../../../core/services/organization-metrics.service';
import { OrganizationMetricsDto } from '../../dtos/organization/organization-metrics.dto';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationMetricsController {
  constructor(private readonly metricsService: OrganizationMetricsService) {}

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
    enum: ['week', 'month', 'year'],
    description: 'Período para las métricas (default: month)',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas de la organización',
    type: OrganizationMetricsDto,
  })
  @ApiResponse({ status: 404, description: 'Organización no encontrada' })
  async getMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: 'week' | 'month' | 'year',
  ): Promise<OrganizationMetricsDto> {
    return this.metricsService.getMetrics(id, { period }) as Promise<OrganizationMetricsDto>;
  }
}

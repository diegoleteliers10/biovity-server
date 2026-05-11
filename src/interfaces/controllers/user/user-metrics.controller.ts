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
import { UserMetricsService } from '../../../core/services/user-metrics.service';
import { UserMetricsDto } from '../../dtos/user/user-metrics.dto';

@ApiTags('users')
@Controller('users')
export class UserMetricsController {
  constructor(private readonly metricsService: UserMetricsService) {}

  @Get(':id/metrics')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener métricas de un usuario' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID del usuario',
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'year'],
    description: 'Período para tendencias (default: month)',
  })
  @ApiResponse({
    status: 200,
    description: 'Métricas del usuario',
    type: UserMetricsDto,
  })
  @ApiResponse({ status: 404, description: 'Usuario no encontrado' })
  async getMetrics(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('period') period?: 'week' | 'month' | 'year',
  ): Promise<UserMetricsDto> {
    return this.metricsService.getMetrics(
      id,
      period,
    ) as Promise<UserMetricsDto>;
  }
}

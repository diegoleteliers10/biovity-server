import { Controller, Get, Query, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { AdminService } from '../../../core/services/admin.service';
import {
  AdminStatsResponseDto,
  RegistrationsTrendResponseDto,
  RegistrationsTrendQueryDto,
  TopJobsResponseDto,
  TopJobsQueryDto,
  ApplicationsTrendResponseDto,
  ApplicationsTrendQueryDto,
  AdminHealthDetailedResponseDto,
} from '../../dtos/admin/admin.dto';

@ApiTags('admin')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Obtener estadísticas generales del admin' })
  @ApiResponse({
    status: 200,
    description: 'Estadísticas del admin',
    type: AdminStatsResponseDto,
  })
  async getStats(): Promise<AdminStatsResponseDto> {
    return this.adminService.getAdminStats();
  }

  @Get('analytics/registrations')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trend de registros de usuarios' })
  @ApiQuery({ name: 'period', required: false, enum: [30, 90] })
  @ApiResponse({
    status: 200,
    description: 'Trend de registros por día',
    type: RegistrationsTrendResponseDto,
  })
  async getRegistrationsTrend(
    @Query() query: RegistrationsTrendQueryDto,
  ): Promise<RegistrationsTrendResponseDto> {
    return this.adminService.getRegistrationsTrend(query.period ?? 30);
  }

  @Get('analytics/top-jobs')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Jobs más aplicados' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Top jobs por número de postulaciones',
    type: TopJobsResponseDto,
  })
  async getTopJobs(
    @Query() query: TopJobsQueryDto,
  ): Promise<TopJobsResponseDto> {
    return this.adminService.getTopJobs(query.limit ?? 10);
  }

  @Get('analytics/applications-trend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Trend de postulaciones' })
  @ApiQuery({ name: 'period', required: false, enum: [30, 90] })
  @ApiResponse({
    status: 200,
    description: 'Trend de postulaciones por día',
    type: ApplicationsTrendResponseDto,
  })
  async getApplicationsTrend(
    @Query() query: ApplicationsTrendQueryDto,
  ): Promise<ApplicationsTrendResponseDto> {
    return this.adminService.getApplicationsTrend(query.period ?? 30);
  }

  @Get('health/detailed')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Health check detallado del servidor' })
  @ApiResponse({
    status: 200,
    description: 'Health detallado',
    type: AdminHealthDetailedResponseDto,
  })
  async getHealthDetailed(): Promise<AdminHealthDetailedResponseDto> {
    return this.adminService.getAdminHealthDetailed();
  }
}

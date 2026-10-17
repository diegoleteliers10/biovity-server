import {
  Controller,
  Get,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  BadRequestException,
  DefaultValuePipe,
  ParseIntPipe,
} from '@nestjs/common';
import {
  APPLICATION_SOURCE_CHANNELS,
  type ApplicationSourceChannel,
  type ApplicationSourceMethod,
} from '../../../core/domain/application-source';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { OrganizationMetricsService } from '../../../core/services/organization-metrics.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import {
  OrganizationMetricsDto,
  ResponseTimeVisitsPageDto,
  StageDurationVisitsPageDto,
  CustomStageApplicationsPageDto,
  SourceApplicationsPageDto,
} from '../../dtos/organization/organization-metrics.dto';
import type { ResponseTimeBucket } from '../../../core/services/organization-metrics.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

const isCalendarDate = (value: string): boolean => {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
};

const APPLICATION_SOURCE_METHODS: readonly ApplicationSourceMethod[] = [
  'tracked_link',
  'self_reported',
  'unknown',
] as const;

const responseTimeBuckets: readonly ResponseTimeBucket[] = [
  'lessThan24h',
  'oneToThreeDays',
  'threeToSevenDays',
  'moreThanSevenDays',
  'unanswered',
];

const isResponseTimeBucket = (value: string): value is ResponseTimeBucket =>
  responseTimeBuckets.some(bucket => bucket === value);

@ApiTags('organizations')
@Roles('organization')
@Controller('organizations')
export class OrganizationMetricsController {
  constructor(
    private readonly metricsService: OrganizationMetricsService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get(':id/metrics/response-visits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar postulaciones por tiempo de respuesta' })
  @ApiQuery({
    name: 'bucket',
    required: true,
    enum: [
      'lessThan24h',
      'oneToThreeDays',
      'threeToSevenDays',
      'moreThanSevenDays',
      'unanswered',
    ],
  })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'year', 'custom'],
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: ResponseTimeVisitsPageDto })
  async getResponseVisits(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('bucket') bucket: string,
    @Query('period', new DefaultValuePipe('month')) period: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @CurrentUser() requester?: AuthenticatedUser,
  ): Promise<ResponseTimeVisitsPageDto> {
    await this.organizationAccess.assertAccess(id, requester, 'read');
    if (
      !isResponseTimeBucket(bucket) ||
      !['week', 'month', 'year', 'custom'].includes(period) ||
      page < 1 ||
      page > 100_000 ||
      pageSize < 1 ||
      pageSize > 50 ||
      (startDate !== undefined && !isCalendarDate(startDate)) ||
      (endDate !== undefined && !isCalendarDate(endDate)) ||
      (period === 'custom' && (!startDate || !endDate)) ||
      (startDate !== undefined && endDate !== undefined && startDate > endDate)
    ) {
      throw new BadRequestException('Filtros o paginación inválidos');
    }
    return this.metricsService.getResponseTimeVisits(
      id,
      bucket,
      period,
      startDate,
      endDate,
      page,
      pageSize,
    );
  }

  @Get(':id/metrics/stage-visits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar las visitas cerradas de una etapa' })
  @ApiQuery({ name: 'jobId', required: true, type: String, format: 'uuid' })
  @ApiQuery({ name: 'stageId', required: true, type: String, format: 'uuid' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: StageDurationVisitsPageDto })
  async getStageVisits(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('jobId', ParseUUIDPipe) jobId: string,
    @Query('stageId', ParseUUIDPipe) stageId: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @CurrentUser() requester?: AuthenticatedUser,
  ): Promise<StageDurationVisitsPageDto> {
    await this.organizationAccess.assertAccess(id, requester, 'read');
    if (
      page < 1 ||
      page > 100_000 ||
      pageSize < 1 ||
      pageSize > 50 ||
      (startDate !== undefined && !isCalendarDate(startDate)) ||
      (endDate !== undefined && !isCalendarDate(endDate)) ||
      (startDate !== undefined && endDate !== undefined && startDate > endDate)
    ) {
      throw new BadRequestException('Filtros o paginación inválidos');
    }
    return this.metricsService.getStageDurationVisits(
      id,
      jobId,
      stageId,
      startDate,
      endDate,
      page,
      pageSize,
    );
  }

  @Get(':id/metrics/custom-stage-applications')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Listar postulaciones que ingresaron a una etapa propia',
  })
  @ApiQuery({ name: 'jobId', required: true, type: String, format: 'uuid' })
  @ApiQuery({ name: 'stageId', required: true, type: String, format: 'uuid' })
  @ApiQuery({
    name: 'period',
    required: false,
    enum: ['week', 'month', 'year', 'custom'],
  })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'pageSize', required: false, type: Number, example: 20 })
  @ApiResponse({ status: 200, type: CustomStageApplicationsPageDto })
  async getCustomStageApplications(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('jobId', ParseUUIDPipe) jobId: string,
    @Query('stageId', ParseUUIDPipe) stageId: string,
    @Query('period', new DefaultValuePipe('month')) period: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @CurrentUser() requester?: AuthenticatedUser,
  ): Promise<CustomStageApplicationsPageDto> {
    await this.organizationAccess.assertAccess(id, requester, 'read');
    if (
      !['week', 'month', 'year', 'custom'].includes(period) ||
      page < 1 ||
      page > 100_000 ||
      pageSize < 1 ||
      pageSize > 50 ||
      (startDate !== undefined && !isCalendarDate(startDate)) ||
      (endDate !== undefined && !isCalendarDate(endDate)) ||
      (period === 'custom' && (!startDate || !endDate)) ||
      (startDate !== undefined && endDate !== undefined && startDate > endDate)
    ) {
      throw new BadRequestException('Filtros o paginación inválidos');
    }
    return this.metricsService.getCustomStageApplications(
      id,
      jobId,
      stageId,
      startDate,
      endDate,
      page,
      pageSize,
      period,
    );
  }

  @Get(':id/metrics/source-applications')
  @Roles('organization')
  @ApiOperation({ summary: 'Listar postulaciones de un canal de fuente' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'sourceChannel', required: true, type: String })
  @ApiQuery({ name: 'sourceMethod', required: true, type: String })
  @ApiResponse({ status: 200, type: SourceApplicationsPageDto })
  async getSourceApplications(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('sourceChannel') sourceChannel: string,
    @Query('sourceMethod') sourceMethod: string,
    @Query('period', new DefaultValuePipe('month')) period: string,
    @Query('startDate') startDate: string | undefined,
    @Query('endDate') endDate: string | undefined,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(20), ParseIntPipe) pageSize: number,
    @CurrentUser() requester?: AuthenticatedUser,
  ): Promise<SourceApplicationsPageDto> {
    await this.organizationAccess.assertAccess(id, requester, 'read');
    const sourceChannels: readonly ApplicationSourceChannel[] =
      APPLICATION_SOURCE_CHANNELS;
    const parsedChannel = sourceChannels.find(
      channel => channel === sourceChannel,
    );
    const parsedMethod = APPLICATION_SOURCE_METHODS.find(
      method => method === sourceMethod,
    );
    if (
      !parsedChannel ||
      !parsedMethod ||
      !['week', 'month', 'year', 'custom'].includes(period) ||
      page < 1 ||
      page > 100_000 ||
      pageSize < 1 ||
      pageSize > 50 ||
      (startDate !== undefined && !isCalendarDate(startDate)) ||
      (endDate !== undefined && !isCalendarDate(endDate)) ||
      (period === 'custom' && (!startDate || !endDate)) ||
      (startDate !== undefined && endDate !== undefined && startDate > endDate)
    ) {
      throw new BadRequestException('Filtros o paginación inválidos');
    }
    return this.metricsService.getSourceApplications(
      id,
      parsedChannel,
      parsedMethod,
      period,
      startDate,
      endDate,
      page,
      pageSize,
    );
  }

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

import { ApiProperty } from '@nestjs/swagger';

export class DashboardMetricsDto {
  @ApiProperty({ example: 5, description: 'Cantidad de ofertas activas' })
  activeJobs: number;

  @ApiProperty({ example: 12, description: 'Postulaciones pendientes' })
  pendingApplications: number;

  @ApiProperty({
    example: 3,
    description: 'Entrevistas programadas en el período',
  })
  interviewsThisPeriod: number;

  @ApiProperty({
    example: 15,
    description: 'Porcentaje de cambio vs período anterior',
  })
  interviewsTrend: number;

  @ApiProperty({
    example: 8,
    description: 'Porcentaje de cambio en postulaciones vs período anterior',
  })
  applicationsTrend: number;
}

export class PipelineByStatusDto {
  @ApiProperty({ example: 5 })
  pendiente: number;

  @ApiProperty({ example: 2 })
  oferta: number;

  @ApiProperty({ example: 3 })
  entrevista: number;

  @ApiProperty({ example: 1 })
  rechazado: number;

  @ApiProperty({ example: 0 })
  contratado: number;
}

export class PipelineAvgTimeDto {
  @ApiProperty({ example: 4.5, description: 'Días promedio hasta entrevista' })
  entrevista: number;

  @ApiProperty({ example: 10.2, description: 'Días promedio hasta oferta' })
  oferta: number;

  @ApiProperty({
    example: 14.1,
    description: 'Días promedio hasta contratación',
  })
  contratado: number;
}

export class PipelineMetricsDto {
  @ApiProperty({ example: 11, description: 'Total de postulaciones' })
  totalApplications: number;

  @ApiProperty({ type: PipelineByStatusDto })
  byStatus: PipelineByStatusDto;

  @ApiProperty({
    example: 27,
    description: 'Tasa de conversión: entrevistas / total %',
  })
  conversionRate: number;

  @ApiProperty({ type: PipelineAvgTimeDto })
  avgTimeInStages: PipelineAvgTimeDto;
}

export class JobPerformanceDto {
  @ApiProperty({ example: 'uuid', description: 'ID de la oferta' })
  jobId: string;

  @ApiProperty({
    example: 'Backend Developer',
    description: 'Título de la oferta',
  })
  jobTitle: string;

  @ApiProperty({ example: 150, description: 'Cantidad de vistas' })
  views: number;

  @ApiProperty({ example: 12, description: 'Cantidad de postulaciones' })
  applications: number;

  @ApiProperty({
    example: 8,
    description: 'Tasa de conversión: postulaciones / vistas %',
  })
  applicationRate: number;
}

export class TrendDataDto {
  @ApiProperty({ example: '2024-01-15', description: 'Fecha' })
  date: string;

  @ApiProperty({ example: 3, description: 'Postulaciones ese día' })
  applications: number;

  @ApiProperty({ example: 1, description: 'Entrevistas ese día' })
  interviews: number;
}

export class GeographicDistributionDto {
  @ApiProperty({ example: 'Santiago', description: 'Ciudad' })
  city: string;

  @ApiProperty({ example: 25, description: 'Cantidad de postulantes' })
  count: number;

  @ApiProperty({ example: 35, description: 'Porcentaje del total' })
  percentage: number;
}

export class ResponseTimeDistributionDto {
  @ApiProperty({
    example: 4,
    description: 'Postulaciones respondidas en menos de 24h',
  })
  lessThan24h: number;

  @ApiProperty({
    example: 6,
    description: 'Postulaciones respondidas entre 1 y 3 días',
  })
  oneToThreeDays: number;

  @ApiProperty({
    example: 3,
    description: 'Postulaciones respondidas entre 3 y 7 días',
  })
  threeToSevenDays: number;

  @ApiProperty({
    example: 1,
    description: 'Postulaciones respondidas en 7 días o más',
  })
  moreThanSevenDays: number;
}

export class OrganizationMetricsDto {
  @ApiProperty({ type: DashboardMetricsDto })
  dashboard: DashboardMetricsDto;

  @ApiProperty({ type: PipelineMetricsDto })
  pipeline: PipelineMetricsDto;

  @ApiProperty({ type: [JobPerformanceDto] })
  topJobs: JobPerformanceDto[];

  @ApiProperty({ type: [TrendDataDto] })
  recentTrend: TrendDataDto[];

  @ApiProperty({ type: [GeographicDistributionDto] })
  geographicDistribution: GeographicDistributionDto[];

  @ApiProperty({
    example: 12.5,
    description: 'Días promedio hasta contratación',
  })
  avgHiringTimeDays: number;

  @ApiProperty({ type: ResponseTimeDistributionDto })
  responseTimeDistribution: ResponseTimeDistributionDto;

  @ApiProperty({
    example: 7,
    description: 'Postulaciones del período aún sin responder',
  })
  unansweredCount: number;
}

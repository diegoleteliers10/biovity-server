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

export class OrganizationMetricsDto {
  @ApiProperty({ type: DashboardMetricsDto })
  dashboard: DashboardMetricsDto;

  @ApiProperty({ type: PipelineMetricsDto })
  pipeline: PipelineMetricsDto;

  @ApiProperty({ type: [JobPerformanceDto] })
  topJobs: JobPerformanceDto[];

  @ApiProperty({ type: [TrendDataDto] })
  recentTrend: TrendDataDto[];
}

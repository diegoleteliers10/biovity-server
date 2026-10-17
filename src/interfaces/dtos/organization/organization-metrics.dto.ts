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

export class PipelineStageDurationDto {
  @ApiProperty({ example: 'uuid' })
  jobId: string;

  @ApiProperty({ example: 'Analista de laboratorio' })
  jobTitle: string;

  @ApiProperty({ example: 'uuid' })
  stageId: string;

  @ApiProperty({ example: 'Entrevista técnica' })
  stageName: string;

  @ApiProperty({
    example: 4.5,
    description: 'Promedio de días por visita cerrada',
  })
  averageCompletedDays: number;

  @ApiProperty({ example: 12, description: 'Cantidad de visitas cerradas' })
  completedVisitCount: number;
}

export class StageDurationVisitDto {
  @ApiProperty({ example: 'uuid', description: 'ID único de la visita' })
  visitId: string;

  @ApiProperty({ example: 'uuid', description: 'ID de la postulación' })
  applicationId: string;

  @ApiProperty({ example: 'Nombre del postulante' })
  applicantName: string;

  @ApiProperty({ example: '2026-01-05T15:00:00Z' })
  enteredAt: string;

  @ApiProperty({ example: '2026-01-06T15:00:00Z' })
  exitedAt: string;

  @ApiProperty({ example: 1.25, description: 'Duración en días' })
  durationDays: number;
}

export class StageDurationVisitsPageDto {
  @ApiProperty({ type: [StageDurationVisitDto] })
  rows: StageDurationVisitDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class CustomStageConversionDto {
  @ApiProperty({ example: 'uuid' })
  jobId: string;

  @ApiProperty({ example: 'Analista de laboratorio' })
  jobTitle: string;

  @ApiProperty({ example: 'uuid' })
  stageId: string;

  @ApiProperty({ example: 'Revisión técnica' })
  stageName: string;

  @ApiProperty({ example: 18 })
  enteredApplications: number;

  @ApiProperty({ example: 8 })
  advancedApplications: number;

  @ApiProperty({ example: 44 })
  conversionRate: number;
}

export class CustomStageApplicationDto {
  @ApiProperty({ example: 'uuid' })
  applicationId: string;

  @ApiProperty({ example: 'Nombre del postulante' })
  applicantName: string;

  @ApiProperty({ example: 'Revisión técnica' })
  stageNameAtEntry: string | null;

  @ApiProperty({ example: '2026-01-05T15:00:00Z' })
  firstEnteredAt: string;

  @ApiProperty({ example: true })
  advanced: boolean;

  @ApiProperty({ example: 'entrevista' })
  currentStatus: string;
}

export class CustomStageApplicationsPageDto {
  @ApiProperty({ type: [CustomStageApplicationDto] })
  rows: CustomStageApplicationDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class SourceApplicationDto {
  @ApiProperty({ example: 'uuid' })
  applicationId: string;

  @ApiProperty({ example: 'uuid' })
  jobId: string;

  @ApiProperty({ example: 'Analista de laboratorio' })
  jobTitle: string;

  @ApiProperty({ example: 'Nombre del postulante' })
  candidateName: string;

  @ApiProperty({ example: 'entrevista' })
  status: string;

  @ApiProperty({ example: '2026-01-05T15:00:00Z' })
  appliedAt: string;
}

export class SourceApplicationsPageDto {
  @ApiProperty({ type: [SourceApplicationDto] })
  rows: SourceApplicationDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class ResponseTimeVisitDto {
  @ApiProperty({ example: 'uuid' })
  applicationId: string;

  @ApiProperty({ example: 'uuid' })
  jobId: string;

  @ApiProperty({ example: 'Nombre del postulante' })
  applicantName: string;

  @ApiProperty({ example: 'Analista de laboratorio' })
  jobTitle: string;

  @ApiProperty({ example: '2026-01-05T15:00:00Z' })
  submittedAt: string;

  @ApiProperty({ example: '2026-01-06T15:00:00Z', nullable: true })
  respondedAt: string | null;

  @ApiProperty({ example: 1.25, nullable: true })
  responseDays: number | null;

  @ApiProperty({ example: 'entrevista' })
  currentStatus: string;
}

export class ResponseTimeVisitsPageDto {
  @ApiProperty({ type: [ResponseTimeVisitDto] })
  rows: ResponseTimeVisitDto[];

  @ApiProperty({ example: 42 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 20 })
  pageSize: number;
}

export class PipelineMetricsDto {
  @ApiProperty({ example: 11, description: 'Total de postulaciones' })
  totalApplications: number;

  @ApiProperty({
    example: { entrevista: 5, oferta: 2, contratado: 1 },
    description: 'Postulaciones distintas que llegaron alguna vez a cada etapa',
  })
  reachedCounts: {
    entrevista: number;
    oferta: number;
    contratado: number;
  };

  @ApiProperty({ type: PipelineByStatusDto })
  byStatus: PipelineByStatusDto;

  @ApiProperty({
    example: 27,
    description: 'Tasa de conversión: entrevistas / total %',
  })
  conversionRate: number;

  @ApiProperty({ type: [CustomStageConversionDto] })
  customStageConversions: CustomStageConversionDto[];

  @ApiProperty({ type: [PipelineStageDurationDto] })
  stageDurations: PipelineStageDurationDto[];
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

  @ApiProperty({ type: () => [ApplicationSourceAttributionDto] })
  sourceAttribution: ApplicationSourceAttributionDto[];
}

export class ApplicationSourceAttributionDto {
  @ApiProperty({ example: 'linkedin' })
  sourceChannel: string;

  @ApiProperty({ example: 'self_reported' })
  sourceMethod: string;

  @ApiProperty({ example: 20 })
  applications: number;

  @ApiProperty({ example: 8 })
  reachedInterview: number;

  @ApiProperty({ example: 2 })
  hired: number;
}

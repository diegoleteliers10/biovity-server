import { ApiProperty } from '@nestjs/swagger';

export class QuickMetricsDto {
  @ApiProperty({ example: 15, description: 'Total aplicaciones del usuario' })
  totalApplications: number;

  @ApiProperty({
    example: 8,
    description: 'Aplicaciones activas (pendiente/entrevista/oferta)',
  })
  activeApplications: number;

  @ApiProperty({
    example: 45,
    description: '% de postulaciones que salieron de pendiente',
  })
  responseRate: number;
}

export class ApplicationBucketDto {
  @ApiProperty({ example: 3 })
  lessThan24h: number;

  @ApiProperty({ example: 5 })
  oneToThreeDays: number;

  @ApiProperty({ example: 4 })
  threeToSevenDays: number;

  @ApiProperty({ example: 3 })
  moreThanSevenDays: number;
}

export class FunnelStageDto {
  @ApiProperty({ example: 50 })
  count: number;

  @ApiProperty({
    example: 100,
    description: 'Porcentaje vs total aplicaciones',
  })
  percentage: number;
}

export class FunnelDto {
  @ApiProperty({ type: FunnelStageDto })
  aplicado: FunnelStageDto;

  @ApiProperty({ type: FunnelStageDto })
  entrevista: FunnelStageDto;

  @ApiProperty({ type: FunnelStageDto })
  oferta: FunnelStageDto;

  @ApiProperty({ type: FunnelStageDto })
  contratado: FunnelStageDto;
}

export class IndustryDistributionDto {
  @ApiProperty({ example: 'Tech', description: 'Nombre de la industria' })
  industry: string;

  @ApiProperty({ example: 8, description: 'Cantidad de postulaciones' })
  count: number;

  @ApiProperty({ example: 40, description: 'Porcentaje del total' })
  percentage: number;
}

export class TrendDataPointDto {
  @ApiProperty({ example: '2024-01', description: 'Mes en formato YYYY-MM' })
  month: string;

  @ApiProperty({ example: 5, description: 'Cantidad de postulaciones' })
  applications: number;
}

export class UpcomingInterviewDto {
  @ApiProperty({ example: 'uuid', description: 'ID del evento' })
  eventId: string;

  @ApiProperty({
    example: 'Entrevista técnica',
    description: 'Título del evento',
  })
  title: string;

  @ApiProperty({ example: '2024-01-20T10:00:00Z', description: 'Fecha y hora' })
  startAt: string;

  @ApiProperty({ example: 'uuid', description: 'ID del trabajo' })
  jobId: string;

  @ApiProperty({
    example: 'Backend Developer',
    description: 'Título del trabajo',
  })
  jobTitle: string;

  @ApiProperty({ example: 'uuid', description: 'ID de la organización' })
  organizationId: string;

  @ApiProperty({
    example: 'Tech Corp',
    description: 'Nombre de la organización',
  })
  organizationName: string;
}

export class RecentApplicationDto {
  @ApiProperty({ example: 'uuid', description: 'ID de la postulación' })
  applicationId: string;

  @ApiProperty({
    example: 'Backend Developer',
    description: 'Título del trabajo',
  })
  jobTitle: string;

  @ApiProperty({
    example: 'Tech Corp',
    description: 'Nombre de la organización',
  })
  organizationName: string;

  @ApiProperty({
    example: 'pendiente',
    description: 'Estado de la postulación',
  })
  status: string;

  @ApiProperty({ example: '2024-01-15', description: 'Fecha de postulación' })
  appliedAt: string;
}

export class UserKPIsDto {
  @ApiProperty({
    example: 12,
    description: 'Postulaciones en los últimos 30 días',
  })
  applicationsLast30Days: number;

  @ApiProperty({ example: 35, description: '% de avanzadas vs totales' })
  responseRate: number;

  @ApiProperty({ example: 4, description: 'Total con estado entrevista' })
  interviews: number;

  @ApiProperty({ example: 1, description: 'Total con estado oferta' })
  offers: number;

  @ApiProperty({
    example: 5.2,
    description: 'Días promedio hasta primer cambio de estado',
  })
  avgResponseTimeDays: number;

  @ApiProperty({ example: 42, description: 'Vistas del perfil' })
  profileViews: number;
}

export class UserMetricsDto {
  @ApiProperty({ type: QuickMetricsDto })
  quickMetrics: QuickMetricsDto;

  @ApiProperty({ type: UserKPIsDto })
  kpis: UserKPIsDto;

  @ApiProperty({ type: [TrendDataPointDto] })
  applicationsTrend: TrendDataPointDto[];

  @ApiProperty({ type: ApplicationBucketDto })
  responseTimeDistribution: ApplicationBucketDto;

  @ApiProperty({ type: FunnelDto })
  hiringFunnel: FunnelDto;

  @ApiProperty({ type: [IndustryDistributionDto] })
  industriesApplied: IndustryDistributionDto[];

  @ApiProperty({ type: [UpcomingInterviewDto] })
  upcomingInterviews: UpcomingInterviewDto[];

  @ApiProperty({ type: [RecentApplicationDto] })
  recentApplications: RecentApplicationDto[];
}

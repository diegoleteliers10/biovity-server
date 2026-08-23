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
    description:
      '% de postulaciones que alcanzaron entrevista/oferta/contratado',
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

export class StatusStepDto {
  @ApiProperty({ example: 50 })
  count: number;

  @ApiProperty({
    example: 100,
    description: 'Porcentaje vs total de postulaciones',
  })
  percentage: number;
}

export class StatusBreakdownDto {
  @ApiProperty({ type: StatusStepDto })
  pendiente: StatusStepDto;

  @ApiProperty({ type: StatusStepDto })
  entrevista: StatusStepDto;

  @ApiProperty({ type: StatusStepDto })
  oferta: StatusStepDto;

  @ApiProperty({ type: StatusStepDto })
  contratado: StatusStepDto;

  @ApiProperty({ type: StatusStepDto })
  rechazado: StatusStepDto;

  @ApiProperty({ type: StatusStepDto })
  desistido: StatusStepDto;
}

export class CategoryDistributionDto {
  @ApiProperty({
    example: 'Biotecnología',
    description: 'Categoría del trabajo',
  })
  category: string;

  @ApiProperty({ example: 8, description: 'Cantidad de postulaciones' })
  count: number;

  @ApiProperty({ example: 40, description: 'Porcentaje del total' })
  percentage: number;
}

export class TrendDataPointDto {
  @ApiProperty({
    example: '2024-01-01',
    description: 'Inicio del bucket en formato YYYY-MM-DD',
  })
  date: string;

  @ApiProperty({ example: 5, description: 'Cantidad de postulaciones' })
  applications: number;
}

export class UserKPIsDto {
  @ApiProperty({
    example: 12,
    description: 'Postulaciones en los últimos 30 días',
  })
  applicationsLast30Days: number;

  @ApiProperty({
    example: 4,
    description:
      'Aplicaciones que alguna vez alcanzaron entrevista (acumulado)',
  })
  interviews: number;

  @ApiProperty({
    example: 1,
    description: 'Aplicaciones que alguna vez alcanzaron oferta (acumulado)',
  })
  offers: number;

  @ApiProperty({
    example: 5.2,
    nullable: true,
    description:
      'Días promedio hasta primer cambio de estado (null si sin datos)',
  })
  avgResponseTimeDays: number | null;

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

  @ApiProperty({ type: StatusBreakdownDto })
  statusBreakdown: StatusBreakdownDto;

  @ApiProperty({ type: [CategoryDistributionDto] })
  categoriesApplied: CategoryDistributionDto[];
}

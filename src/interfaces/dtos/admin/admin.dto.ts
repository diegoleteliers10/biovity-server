import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class AdminStatsResponseDto {
  @ApiProperty({ example: 1240 })
  users: {
    total: number;
    professionals: number;
    organizations: number;
    active: number;
    inactive: number;
    recentCount: number;
    recentTrend: number;
  };

  @ApiProperty({ example: 89 })
  waitlist: {
    total: number;
    professionals: number;
    organizations: number;
  };

  @ApiProperty({ example: 342 })
  platform: {
    activeJobs: number;
    totalApplications: number;
    totalOrganizations: number;
  };
}

export class RegistrationDataPointDto {
  @ApiProperty({ example: '2026-05-01' })
  date: string;

  @ApiProperty({ example: 12 })
  professionals: number;

  @ApiProperty({ example: 3 })
  organizations: number;
}

export class RegistrationsTrendResponseDto {
  data: RegistrationDataPointDto[];

  @ApiProperty({ example: { professionals: 284, organizations: 67 } })
  totals: {
    professionals: number;
    organizations: number;
  };
}

export class TopJobDto {
  @ApiProperty({ example: 'b1f2c3d4-e5f6-7890-abcd-ef1234567890' })
  jobId: string;

  @ApiProperty({ example: 'Investigador/a en Biotecnología' })
  title: string;

  @ApiProperty({ example: 'LabChile SpA' })
  organizationName: string;

  @ApiProperty({ example: 47 })
  applications: number;

  @ApiProperty({ example: 1203 })
  views: number;

  @ApiProperty({ example: 4 })
  applicationRate: number;
}

export class TopJobsResponseDto {
  data: TopJobDto[];
}

export class ApplicationTrendPointDto {
  @ApiProperty({ example: '2026-05-01' })
  date: string;

  @ApiProperty({ example: 8 })
  count: number;
}

export class ApplicationsTrendResponseDto {
  data: ApplicationTrendPointDto[];

  @ApiProperty({ example: 234 })
  total: number;
}

export class AdminHealthDetailedResponseDto {
  @ApiProperty({ enum: ['ok', 'degraded'] })
  status: 'ok' | 'degraded';

  @ApiProperty({ example: '2026-05-20T14:30:00.000Z' })
  timestamp: string;

  @ApiProperty({ example: 12 })
  latencyMs: number;

  @ApiProperty()
  checks: {
    database: {
      status: 'up' | 'down';
      message?: string;
      error?: string;
    };
  };
}

export class RegistrationsTrendQueryDto {
  @ApiPropertyOptional({
    enum: [30, 90],
    default: 30,
    description: 'Período en días',
  })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(90)
  @Type(() => Number)
  period?: 30 | 90 = 30;
}

export class TopJobsQueryDto {
  @ApiPropertyOptional({ default: 10, description: 'Límite de resultados' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  limit?: number = 10;
}

export class ApplicationsTrendQueryDto {
  @ApiPropertyOptional({
    enum: [30, 90],
    default: 30,
    description: 'Período en días',
  })
  @IsOptional()
  @IsInt()
  @Min(7)
  @Max(90)
  @Type(() => Number)
  period?: 30 | 90 = 30;
}
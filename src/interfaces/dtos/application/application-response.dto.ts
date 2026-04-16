import {
  IsString,
  IsUUID,
  IsDateString,
  IsIn,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum ApplicationStatus {
  PENDIENTE = 'pendiente',
  OFERTA = 'oferta',
  ENTREVISTA = 'entrevista',
  RECHAZADO = 'rechazado',
  CONTRATADO = 'contratado',
}

export class JobSummaryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Backend Developer' })
  @IsString()
  title: string;

  @ApiProperty({ format: 'uuid' })
  @IsString()
  organizationId: string;
}

export class CandidateSummaryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 'Juan Pérez' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'juan@example.com' })
  @IsString()
  email: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg' })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsOptional()
  @IsString()
  profession?: string;
}

export class AnswerSummaryDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  questionId: string;

  @ApiProperty({ example: 'Mi respuesta aquí...' })
  @IsString()
  value: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  createdAt: Date;
}

export class ApplicationResponseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  jobId: string;

  @ValidateNested()
  @Type(() => JobSummaryDto)
  job?: JobSummaryDto;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  candidateId: string;

  @ValidateNested()
  @Type(() => CandidateSummaryDto)
  candidate?: CandidateSummaryDto;

  @ApiPropertyOptional({ example: 'Estimado equipo...' })
  @IsOptional()
  @IsString()
  coverLetter?: string;

  @ApiPropertyOptional({ example: 800000 })
  @IsOptional()
  @IsNumber()
  salaryMin?: number;

  @ApiPropertyOptional({ example: 1200000 })
  @IsOptional()
  @IsNumber()
  salaryMax?: number;

  @ApiPropertyOptional({ example: 'USD' })
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional({ example: '2024-06-01' })
  @IsOptional()
  @IsString()
  availabilityDate?: string;

  @ApiPropertyOptional({ example: 'https://example.com/resume.pdf' })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  updatedAt: Date;

  @ApiProperty({ enum: ApplicationStatus })
  @IsString()
  @IsIn(['pendiente', 'oferta', 'entrevista', 'rechazado', 'contratado'])
  status: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';

  @ApiPropertyOptional({ type: [AnswerSummaryDto] })
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => AnswerSummaryDto)
  answers?: AnswerSummaryDto[];
}

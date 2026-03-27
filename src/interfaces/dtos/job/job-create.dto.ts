import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum JobEmploymentType {
  FULL_TIME = 'Full-time',
  PART_TIME = 'Part-time',
  CONTRATO = 'Contrato',
  PRACTICA = 'Practica',
}

export enum JobExperienceLevel {
  ENTRANTE = 'Entrante',
  JUNIOR = 'Junior',
  MID_SENIOR = 'Mid-Senior',
  SENIOR = 'Senior',
  EJECUTIVO = 'Ejecutivo',
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export class JobSalaryDto {
  @ApiPropertyOptional({ example: 800000, description: 'Salario mínimo' })
  @IsOptional()
  @IsNumber()
  min?: number;

  @ApiPropertyOptional({ example: 1200000, description: 'Salario máximo' })
  @IsOptional()
  @IsNumber()
  max?: number;

  @ApiPropertyOptional({ example: 'CLP', description: 'Moneda' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiPropertyOptional({ example: 'monthly', description: 'Período de pago' })
  @IsOptional()
  @IsString()
  period?: string;

  @ApiPropertyOptional({ example: true, description: '¿Es negociable?' })
  @IsOptional()
  isNegotiable?: boolean;
}

export class JobLocationDto {
  @ApiPropertyOptional({ example: 'Santiago', description: 'Ciudad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Santiago', description: 'Estado/Región' })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({ example: 'Chile', description: 'País' })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({ example: true, description: '¿Es remoto?' })
  @IsOptional()
  isRemote?: boolean;

  @ApiPropertyOptional({ example: false, description: '¿Es híbrido?' })
  @IsOptional()
  isHybrid?: boolean;
}

export class JobBenefitsDto {
  @ApiProperty({ example: 'bonos', description: 'Tipo de beneficio' })
  @IsString()
  tipo: string;

  @ApiProperty({
    example: 'Bonos por desempeño',
    description: 'Título del beneficio',
  })
  @IsString()
  title: string;
}

export class JobCreateDto {
  @ApiProperty({
    format: 'uuid',
    example: '123e4567-e89b-12d3-a456-426614174000',
    description: 'ID de la organización',
  })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    example: 'Backend Developer',
    description: 'Título del trabajo',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Buscamos un desarrollador backend...',
    description: 'Descripción del trabajo',
  })
  @IsString()
  description: string;

  @ApiProperty({
    enum: JobEmploymentType,
    example: JobEmploymentType.FULL_TIME,
    description: 'Tipo de empleo',
  })
  @IsEnum(JobEmploymentType)
  employmentType: JobEmploymentType;

  @ApiProperty({
    enum: JobExperienceLevel,
    example: JobExperienceLevel.MID_SENIOR,
    description: 'Nivel de experiencia',
  })
  @IsEnum(JobExperienceLevel)
  experienceLevel: JobExperienceLevel;

  @ApiPropertyOptional({ type: JobSalaryDto, description: 'Salario' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JobSalaryDto)
  salary?: JobSalaryDto;

  @ApiPropertyOptional({ type: JobLocationDto, description: 'Ubicación' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JobLocationDto)
  location?: JobLocationDto;

  @ApiPropertyOptional({ type: [JobBenefitsDto], description: 'Beneficios' })
  @IsOptional()
  @IsObject()
  @ValidateNested({ each: true })
  @Type(() => JobBenefitsDto)
  benefits?: JobBenefitsDto[];

  @ApiPropertyOptional({
    enum: JobStatus,
    example: JobStatus.ACTIVE,
    description: 'Estado del trabajo',
  })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ example: 0, description: 'Conteo de postulaciones' })
  @IsOptional()
  @IsNumber()
  applicationsCount?: number;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Fecha de expiración',
  })
  @IsOptional()
  @IsString()
  expiresAt?: string;
}

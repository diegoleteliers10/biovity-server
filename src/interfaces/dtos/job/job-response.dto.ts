import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsNumber,
  ValidateNested,
  IsDateString,
  IsArray,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

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
  @IsOptional()
  min?: number;

  @IsOptional()
  max?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  period?: string;

  @IsOptional()
  isNegotiable?: boolean;
}

export class JobLocationDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  isRemote?: boolean;

  @IsOptional()
  isHybrid?: boolean;
}

export class JobBenefitsDto {
  @IsString()
  tipo: string;

  @IsString()
  title: string;
}

export class JobResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(JobEmploymentType)
  employmentType: JobEmploymentType;

  @IsEnum(JobExperienceLevel)
  experienceLevel: JobExperienceLevel;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JobSalaryDto)
  salary?: JobSalaryDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JobLocationDto)
  location?: JobLocationDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobBenefitsDto)
  benefits: JobBenefitsDto[];

  @IsEnum(JobStatus)
  status: JobStatus;

  @IsNumber()
  applicationsCount: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;
}

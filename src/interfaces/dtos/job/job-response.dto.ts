import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
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
  @IsNumber()
  @IsOptional()
  min?: number;

  @IsNumber()
  @IsOptional()
  max?: number;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  period?: string;

  @IsBoolean()
  @IsOptional()
  isNegotiable?: boolean;
}

export class JobLocationDto {
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsBoolean()
  @IsOptional()
  isRemote?: boolean;

  @IsBoolean()
  @IsOptional()
  isHybrid?: boolean;
}

export class JobBenefitsDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;
}

export class JobResponseDto {
  @IsString()
  id: string;

  @IsString()
  organizationId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(JobEmploymentType)
  employmentType: JobEmploymentType;

  @IsEnum(JobExperienceLevel)
  experienceLevel: JobExperienceLevel;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobBenefitsDto)
  benefits: JobBenefitsDto[];

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;

  @IsObject()
  @ValidateNested()
  @Type(() => JobSalaryDto)
  salary: JobSalaryDto;

  @IsEnum(JobStatus)
  status: JobStatus;

  @IsNumber()
  applicationsCount: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: Date;

  @IsObject()
  @ValidateNested()
  @Type(() => JobLocationDto)
  location: JobLocationDto;
}

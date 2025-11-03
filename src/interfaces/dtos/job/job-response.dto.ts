import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum EmploymentType {
  FULL_TIME = 'Full-time',
  PART_TIME = 'Part-time',
  CONTRACT = 'Contrato',
  INTERNSHIP = 'Practica',
}

export enum ExperienceLevel {
  ENTRY = 'Entrante',
  JUNIOR = 'Junior',
  MID_SENIOR = 'Mid-Senior',
  SENIOR = 'Senior',
  EXECUTIVE = 'Ejecutivo',
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export enum Currency {
  USD = 'USD',
  CLP = 'CLP',
}

export class SalaryDto {
  @IsNumber()
  min: number;

  @IsNumber()
  max: number;

  @IsEnum(Currency)
  currency: Currency;

  @IsEnum(['hourly', 'monthly', 'yearly'])
  period: 'hourly' | 'monthly' | 'yearly';

  @IsBoolean()
  @IsOptional()
  isNegotiable?: boolean;
}

export class LocationDto {
  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  country: string;

  @IsBoolean()
  isRemote: boolean;

  @IsBoolean()
  @IsOptional()
  isHybrid?: boolean;
}

export enum BenefitType {
  HEALTH = 'health',
  FINANCIAL = 'financial',
  TIME_OFF = 'time_off',
  PROFESSIONAL = 'professional',
  LIFESTYLE = 'lifestyle',
  TECHNOLOGY = 'technology',
  TRANSPORTATION = 'transportation',
  FAMILY = 'family',
  OTHER = 'other',
}

export class BenefitMetadataDto {
  @IsEnum(BenefitType)
  type: BenefitType;

  @IsString()
  icon: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsNumber()
  @IsOptional()
  priority?: number;
}

export class BenefitDto {
  @IsString()
  title: string;

  @IsString()
  @IsOptional()
  description?: string;

  @ValidateNested()
  @Type(() => BenefitMetadataDto)
  @IsOptional()
  metadata?: BenefitMetadataDto;

  @IsBoolean()
  @IsOptional()
  isCustom?: boolean;
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

  @ValidateNested()
  @Type(() => SalaryDto)
  salary: SalaryDto;

  @ValidateNested()
  @Type(() => LocationDto)
  location: LocationDto;

  @IsEnum(EmploymentType)
  employmentType: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica';

  @IsEnum(ExperienceLevel)
  experienceLevel:
    | 'Entrante'
    | 'Junior'
    | 'Mid-Senior'
    | 'Senior'
    | 'Ejecutivo';

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BenefitDto)
  benefits: BenefitDto[];

  @IsEnum(JobStatus)
  status: JobStatus;

  @IsNumber()
  applicationsCount: number;

  @IsDateString()
  @IsOptional()
  expiresAt?: Date;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;
}

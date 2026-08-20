import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsUUID,
  IsNumber,
  ValidateNested,
  IsDateString,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
  JobEmploymentType,
  JobExperienceLevel,
  JobStatus,
} from '../../../core/domain/enums';

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

export class JobWithApplicationsResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsEnum(JobEmploymentType)
  employmentType?: JobEmploymentType;

  @IsOptional()
  @IsEnum(JobExperienceLevel)
  experienceLevel?: JobExperienceLevel;

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

  // Count of applications for this job
  @IsNumber()
  totalApplications: number;
}

export class JobPaginatedWithApplicationsResponseDto {
  data: JobWithApplicationsResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

import {
  IsString,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsUUID,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobEmploymentType,
  JobExperienceLevel,
  JobStatus,
} from '../../../core/domain/enums';
import { JobSalaryDto, JobLocationDto, JobBenefitsDto } from './job-create.dto';

export class JobUpdateDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({ example: 'Backend Developer' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Buscamos un desarrollador backend...' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: JobEmploymentType })
  @IsOptional()
  @IsEnum(JobEmploymentType)
  employmentType?: JobEmploymentType;

  @ApiPropertyOptional({ enum: JobExperienceLevel })
  @IsOptional()
  @IsEnum(JobExperienceLevel)
  experienceLevel?: JobExperienceLevel;

  @ApiPropertyOptional({ type: JobSalaryDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JobSalaryDto)
  salary?: JobSalaryDto;

  @ApiPropertyOptional({ type: JobLocationDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => JobLocationDto)
  location?: JobLocationDto;

  @ApiPropertyOptional({ type: [JobBenefitsDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobBenefitsDto)
  benefits?: JobBenefitsDto[];

  @ApiPropertyOptional({ enum: JobStatus })
  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  applicationsCount?: number;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsString()
  expiresAt?: string;

  @ApiPropertyOptional({ example: 'research' })
  @IsOptional()
  @IsString()
  category?: string;
}

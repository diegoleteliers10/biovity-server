import {
  IsString,
  IsDateString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
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

export class BenefitDto {
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

  @IsNumber()
  amount: number;

  @IsString()
  location: string;

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

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;
}

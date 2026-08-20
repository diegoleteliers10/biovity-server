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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  JobEmploymentType,
  JobExperienceLevel,
  JobStatus,
} from '../../../core/domain/enums';

export class JobSalaryDto {
  @ApiPropertyOptional({ example: 800000, description: 'Salario mínimo' })
  @IsOptional()
  min?: number;

  @ApiPropertyOptional({ example: 1200000, description: 'Salario máximo' })
  @IsOptional()
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

export class JobResponseDto {
  @ApiProperty({ format: 'uuid', description: 'ID de la oferta' })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'uuid', description: 'ID de la organización' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({
    example: 'Backend Developer',
    description: 'Título del trabajo',
  })
  @IsString()
  title: string;

  @ApiProperty({
    example: 'Descripción del trabajo',
    description: 'Descripción',
  })
  @IsString()
  description: string;

  @ApiPropertyOptional({
    enum: JobEmploymentType,
    example: JobEmploymentType.FULL_TIME,
    description: 'Tipo de empleo',
  })
  @IsOptional()
  @IsEnum(JobEmploymentType)
  employmentType?: JobEmploymentType;

  @ApiPropertyOptional({
    enum: JobExperienceLevel,
    example: JobExperienceLevel.MID_SENIOR,
    description: 'Nivel de experiencia',
  })
  @IsOptional()
  @IsEnum(JobExperienceLevel)
  experienceLevel?: JobExperienceLevel;

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

  @ApiProperty({ type: [JobBenefitsDto], description: 'Beneficios' })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => JobBenefitsDto)
  benefits: JobBenefitsDto[];

  @ApiProperty({
    enum: JobStatus,
    example: JobStatus.ACTIVE,
    description: 'Estado del trabajo',
  })
  @IsEnum(JobStatus)
  status: JobStatus;

  @ApiProperty({ example: 0, description: 'Total de postulaciones' })
  @IsNumber()
  totalApplications: number;

  @ApiProperty({ example: 0, description: 'Conteo de vistas' })
  @IsNumber()
  views: number;

  @ApiPropertyOptional({
    example: '2024-12-31',
    description: 'Fecha de expiración',
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: Date;

  @ApiProperty({ example: '2024-01-01', description: 'Fecha de creación' })
  @IsDateString()
  createdAt: Date;

  @ApiPropertyOptional({
    example: '2024-01-15',
    description: 'Fecha de actualización',
  })
  @IsOptional()
  @IsDateString()
  updatedAt?: Date;

  @ApiPropertyOptional({
    example: 'biotecnologia',
    description: 'Slug de categoría',
  })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({
    example: ['TypeScript', 'React'],
    description: 'Habilidades requeridas',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  requiredSkills?: string[];

  @ApiPropertyOptional({
    example: 3,
    description: 'Experiencia mínima en años',
  })
  @IsOptional()
  @IsNumber()
  minExperience?: number;
}

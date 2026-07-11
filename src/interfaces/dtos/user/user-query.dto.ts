import {
  IsOptional,
  IsString,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsArray,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { UserType } from '../../../core/domain/enums';

export class UserQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsEnum(UserType)
  type?: 'professional' | 'organization';

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  isActive?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  // F8.1 — Filtros faceted
  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  availability?: string;

  /** Comma-separated list of skills */
  @IsOptional()
  @IsString()
  skills?: string;

  /** Minimum years of experience */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  minExperience?: number;

  /** Maximum years of experience */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(0)
  maxExperience?: number;
}

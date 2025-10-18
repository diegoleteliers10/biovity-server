import {
  IsString,
  IsOptional,
  IsArray,
  IsDate,
  IsEnum,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ExperienceDto {
  @IsString()
  jobTitle: string;

  @IsString()
  company: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  achievements?: string[];
}

export class EducationDto {
  @IsString()
  institution: string;

  @IsEnum(['Primaria', 'Secundaria', 'Superior'])
  level: 'Primaria' | 'Secundaria' | 'Superior';

  @IsString()
  degree: string;

  @IsDate()
  @Type(() => Date)
  startDate: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @IsOptional()
  @IsString()
  description?: string;
}

export class LanguageDto {
  @IsString()
  name: string;

  @IsEnum(['Principiante', 'Intermedio', 'Avanzado', 'Nativo'])
  proficiency: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Nativo';
}

export class ResumeResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  experiences: ExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education: EducationDto[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsArray()
  @IsString({ each: true })
  certifications: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages: LanguageDto[];

  @IsArray()
  @IsString({ each: true })
  links: string[];

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

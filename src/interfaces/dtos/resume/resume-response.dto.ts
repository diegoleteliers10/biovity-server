import {
  IsString,
  IsOptional,
  IsArray,
  IsDate,
  IsUUID,
  ValidateNested,
  IsObject,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SkillLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export enum LanguageLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export class ResumeExperienceDto {
  @IsString()
  title: string;

  @IsString()
  startYear: string;

  @IsOptional()
  @IsString()
  endYear?: string;

  @IsOptional()
  stillWorking?: boolean;

  @IsOptional()
  @IsString()
  company?: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class ResumeEducationDto {
  @IsString()
  title: string;

  @IsString()
  startYear: string;

  @IsOptional()
  @IsString()
  endYear?: string;

  @IsOptional()
  stillStudying?: boolean;

  @IsOptional()
  @IsString()
  institute?: string;
}

export class ResumeSkillDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(SkillLevel)
  level?: SkillLevel;
}

export class ResumeLanguageDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsEnum(LanguageLevel)
  level?: LanguageLevel;
}

export class ResumeCertificationDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  link?: string;

  @IsOptional()
  @IsString()
  company?: string;
}

export class CvFileDto {
  @IsString()
  url: string;

  @IsOptional()
  @IsString()
  originalName?: string;

  @IsOptional()
  @IsString()
  mimeType?: string;

  @IsOptional()
  size?: number;

  @IsOptional()
  @Type(() => Date)
  uploadedAt?: Date;
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
  @Type(() => ResumeExperienceDto)
  experiences: ResumeExperienceDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeEducationDto)
  education: ResumeEducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeSkillDto)
  skills: ResumeSkillDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationDto)
  certifications: ResumeCertificationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeLanguageDto)
  languages: ResumeLanguageDto[];

  @IsArray()
  @IsObject({ each: true })
  links: { url: string }[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CvFileDto)
  cvFile?: CvFileDto;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

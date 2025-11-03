import {
  IsString,
  IsOptional,
  IsArray,
  IsDate,
  IsEnum,
  IsUUID,
  ValidateNested,
  IsNumber,
  IsUrl,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CertificateDto {
  @IsString()
  name: string;

  @IsString()
  issuer: string;

  @IsDate()
  @Type(() => Date)
  dateIssued: Date;

  @IsOptional()
  @IsDate()
  @Type(() => Date)
  expirationDate?: Date;

  @IsOptional()
  @IsString()
  credentialId?: string;

  @IsOptional()
  @IsUrl()
  credentialUrl?: string;
}

export class LanguageDto {
  @IsString()
  name: string;

  @IsEnum(['Principiante', 'Intermedio', 'Avanzado', 'Nativo'])
  proficiency: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Nativo';
}

export class LinkDto {
  @IsUrl()
  url: string;
}

export class FileInfoDto {
  @IsUrl()
  url: string;

  @IsString()
  originalName: string;

  @IsString()
  mimeType: string;

  @IsNumber()
  size: number;

  @IsDate()
  @Type(() => Date)
  uploadedAt: Date;
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
  @Type(() => EducationDto)
  experiences: EducationDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  education: EducationDto[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CertificateDto)
  certifications: CertificateDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  languages: LanguageDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LinkDto)
  links: LinkDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => FileInfoDto)
  cvFile?: FileInfoDto;

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

import {
  IsString,
  IsOptional,
  IsArray,
  IsDate,
  IsUUID,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ResumeResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsArray()
  @IsObject({ each: true })
  experiences: Record<string, unknown>[];

  @IsArray()
  @IsObject({ each: true })
  education: Record<string, unknown>[];

  @IsArray()
  @IsString({ each: true })
  skills: string[];

  @IsArray()
  @IsObject({ each: true })
  certifications: Record<string, unknown>[];

  @IsArray()
  @IsObject({ each: true })
  languages: Record<string, unknown>[];

  @IsArray()
  @IsObject({ each: true })
  links: { url: string }[];

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  cvFile?: {
    url: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
    uploadedAt?: Date;
  };

  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @IsDate()
  @Type(() => Date)
  updatedAt: Date;
}

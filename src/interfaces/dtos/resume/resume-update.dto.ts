import {
  IsString,
  IsOptional,
  IsArray,
  IsUUID,
  ValidateNested,
  IsEnum,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { SkillLevel, LanguageLevel } from '../../../core/domain/enums';
import {
  ResumeExperienceDto,
  ResumeEducationDto,
  ResumeSkillDto,
  ResumeLanguageDto,
  ResumeCertificationDto,
  CvFileDto,
  ResumeLinkDto,
} from './resume-create.dto';

export class ResumeUpdateDto {
  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ type: [ResumeExperienceDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeExperienceDto)
  experiences?: ResumeExperienceDto[];

  @ApiPropertyOptional({ type: [ResumeEducationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeEducationDto)
  education?: ResumeEducationDto[];

  @ApiPropertyOptional({ type: [ResumeSkillDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeSkillDto)
  skills?: ResumeSkillDto[];

  @ApiPropertyOptional({ type: [ResumeCertificationDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeCertificationDto)
  certifications?: ResumeCertificationDto[];

  @ApiPropertyOptional({ type: [ResumeLanguageDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeLanguageDto)
  languages?: ResumeLanguageDto[];

  @ApiPropertyOptional({ type: [ResumeLinkDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResumeLinkDto)
  links?: ResumeLinkDto[];

  @ApiPropertyOptional({ type: CvFileDto })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => CvFileDto)
  cvFile?: CvFileDto;
}

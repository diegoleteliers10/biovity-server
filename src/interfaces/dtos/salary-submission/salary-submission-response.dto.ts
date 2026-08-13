import {
  IsUUID,
  IsString,
  IsInt,
  IsEnum,
  IsBoolean,
  IsDateString,
  IsOptional,
} from 'class-validator';
import {
  SalaryExperienceLevel,
  SalaryEducationLevel,
  SalaryWorkMode,
} from '../../../core/domain/enums';

export class SalarySubmissionResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  profession: string;

  @IsString()
  industry: string;

  @IsInt()
  experienceYears: number;

  @IsEnum(SalaryExperienceLevel)
  experienceLevel: SalaryExperienceLevel;

  @IsEnum(SalaryEducationLevel)
  educationLevel: SalaryEducationLevel;

  @IsString()
  region: string;

  @IsEnum(SalaryWorkMode)
  workMode: SalaryWorkMode;

  @IsInt()
  monthlySalaryClp: number;

  @IsInt()
  annualBonusClp: number;

  @IsString({ each: true })
  benefits: string[];

  @IsString({ each: true })
  skills: string[];

  @IsBoolean()
  isVerified: boolean;

  @IsDateString()
  createdAt: Date;

  @IsOptional()
  @IsInt()
  percentile: number | null;

  @IsOptional()
  @IsInt()
  totalInSegment: number;
}

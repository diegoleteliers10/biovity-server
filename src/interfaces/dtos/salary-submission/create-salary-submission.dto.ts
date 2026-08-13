import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
  ArrayMaxSize,
} from 'class-validator';
import {
  SalaryExperienceLevel,
  SalaryEducationLevel,
  SalaryWorkMode,
} from '../../../core/domain/enums';

export class CreateSalarySubmissionDto {
  @IsString()
  profession: string;

  @IsString()
  industry: string;

  @IsInt()
  @Min(0)
  @Max(50)
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
  @Min(300000)
  @Max(20000000)
  monthlySalaryClp: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(50000000)
  annualBonusClp?: number;

  @IsOptional()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  benefits?: string[];

  @IsOptional()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  skills?: string[];
}

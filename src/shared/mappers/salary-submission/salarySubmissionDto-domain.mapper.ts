import {
  SalaryExperienceLevel,
  SalaryEducationLevel,
  SalaryWorkMode,
} from '../../../core/domain/enums';
import { CreateSalarySubmissionDto } from '../../../interfaces/dtos/salary-submission/create-salary-submission.dto';

export interface CreateSalarySubmissionInput {
  profession: string;
  industry: string;
  experienceYears: number;
  experienceLevel: SalaryExperienceLevel;
  educationLevel: SalaryEducationLevel;
  region: string;
  workMode: SalaryWorkMode;
  monthlySalaryClp: number;
  annualBonusClp?: number;
  benefits?: string[];
  skills?: string[];
}

export class SalarySubmissionDtoDomainMapper {
  static toCreateInput(
    dto: CreateSalarySubmissionDto,
  ): CreateSalarySubmissionInput {
    return {
      profession: dto.profession,
      industry: dto.industry,
      experienceYears: dto.experienceYears,
      experienceLevel: dto.experienceLevel,
      educationLevel: dto.educationLevel,
      region: dto.region,
      workMode: dto.workMode,
      monthlySalaryClp: dto.monthlySalaryClp,
      annualBonusClp: dto.annualBonusClp ?? 0,
      benefits: dto.benefits ?? [],
      skills: dto.skills ?? [],
    };
  }
}

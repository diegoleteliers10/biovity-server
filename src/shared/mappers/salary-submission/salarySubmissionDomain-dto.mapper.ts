import { SalarySubmission } from '../../../core/domain/entities/salary-submission.entity';
import { SalarySubmissionResponseDto } from '../../../interfaces/dtos/salary-submission/salary-submission-response.dto';

export class SalarySubmissionDomainDtoMapper {
  static toDto(
    domain: SalarySubmission,
    rank?: { percentile: number; total: number },
  ): SalarySubmissionResponseDto {
    return {
      id: domain.id,
      profession: domain.profession,
      industry: domain.industry,
      experienceYears: domain.experienceYears,
      experienceLevel: domain.experienceLevel,
      educationLevel: domain.educationLevel,
      region: domain.region,
      workMode: domain.workMode,
      monthlySalaryClp: domain.monthlySalaryClp,
      annualBonusClp: domain.annualBonusClp,
      benefits: domain.benefits,
      skills: domain.skills,
      isVerified: domain.isVerified,
      createdAt: domain.createdAt,
      percentile: rank?.percentile ?? null,
      totalInSegment: rank?.total ?? 0,
    };
  }
}

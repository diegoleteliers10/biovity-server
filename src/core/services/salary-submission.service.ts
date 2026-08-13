import { Injectable, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { SalarySubmission } from '../domain/entities/salary-submission.entity';
import {
  ISalarySubmissionRepository,
  SalaryStats,
  SalaryStatsFilter,
  SalaryPercentileRank,
} from '../repositories/salary-submission.repository';
import { CreateSalarySubmissionInput } from '../../shared/mappers/salary-submission/salarySubmissionDto-domain.mapper';

@Injectable()
export class SalarySubmissionService {
  constructor(
    @Inject('ISalarySubmissionRepository')
    private readonly repository: ISalarySubmissionRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async create(
    data: CreateSalarySubmissionInput,
  ): Promise<{ submission: SalarySubmission; rank: SalaryPercentileRank }> {
    const filter: SalaryStatsFilter = {
      profession: data.profession,
      industry: data.industry,
      region: data.region,
    };

    const submission = new SalarySubmission(
      this.generateId(),
      data.profession,
      data.industry,
      data.experienceYears,
      data.experienceLevel,
      data.educationLevel,
      data.region,
      data.workMode,
      data.monthlySalaryClp,
      data.annualBonusClp ?? 0,
      data.benefits ?? [],
      data.skills ?? [],
      false,
      new Date(),
    );

    const saved = await this.repository.create(submission);
    const rank = await this.repository.getPercentileRank(
      data.monthlySalaryClp,
      filter,
    );

    return { submission: saved, rank };
  }

  async getStats(filter: SalaryStatsFilter): Promise<SalaryStats> {
    return this.repository.getStats(filter);
  }
}

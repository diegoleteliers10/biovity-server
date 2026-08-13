import { SalarySubmission } from '../domain/entities/salary-submission.entity';

export interface SalaryStatsFilter {
  profession?: string;
  industry?: string;
  region?: string;
}

export interface SalaryStats {
  count: number;
  average: number;
  median: number;
  p25: number;
  p75: number;
  p90: number;
}

export interface SalaryPercentileRank {
  percentile: number;
  total: number;
}

export const EMPTY_SALARY_STATS: SalaryStats = {
  count: 0,
  average: 0,
  median: 0,
  p25: 0,
  p75: 0,
  p90: 0,
};

export interface ISalarySubmissionRepository {
  create(entity: SalarySubmission): Promise<SalarySubmission>;
  getStats(filter: SalaryStatsFilter): Promise<SalaryStats>;
  getPercentileRank(
    monthlySalaryClp: number,
    filter: SalaryStatsFilter,
  ): Promise<SalaryPercentileRank>;
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SalarySubmissionEntity } from '../database/orm/salary-submission.entity';
import { SalarySubmission } from '../../core/domain/entities/salary-submission.entity';
import { SalarySubmissionDomainOrmMapper } from '../../shared/mappers/salary-submission/salarySubmissionDomain-orm.mapper';
import {
  ISalarySubmissionRepository,
  SalaryStats,
  SalaryStatsFilter,
  SalaryPercentileRank,
  EMPTY_SALARY_STATS,
} from '../../core/repositories/salary-submission.repository';

@Injectable()
export class SalarySubmissionRepositoryImpl implements ISalarySubmissionRepository {
  constructor(
    @InjectRepository(SalarySubmissionEntity)
    private readonly repository: Repository<SalarySubmissionEntity>,
  ) {}

  async create(entity: SalarySubmission): Promise<SalarySubmission> {
    const orm = SalarySubmissionDomainOrmMapper.toOrm(entity);
    const saved = await this.repository.save(orm);
    return SalarySubmissionDomainOrmMapper.toDomain(saved);
  }

  async getStats(filter: SalaryStatsFilter): Promise<SalaryStats> {
    const qb = this.repository
      .createQueryBuilder('s')
      .select('COUNT(*)', 'count')
      .addSelect('COALESCE(AVG(s.monthlySalaryClp), 0)', 'average')
      .addSelect(
        'COALESCE(percentile_cont(0.50) WITHIN GROUP (ORDER BY s.monthlySalaryClp), 0)',
        'median',
      )
      .addSelect(
        'COALESCE(percentile_cont(0.25) WITHIN GROUP (ORDER BY s.monthlySalaryClp), 0)',
        'p25',
      )
      .addSelect(
        'COALESCE(percentile_cont(0.75) WITHIN GROUP (ORDER BY s.monthlySalaryClp), 0)',
        'p75',
      )
      .addSelect(
        'COALESCE(percentile_cont(0.90) WITHIN GROUP (ORDER BY s.monthlySalaryClp), 0)',
        'p90',
      );

    this.applyFilter(qb, filter);

    const row = await qb.getRawOne<{
      count: string;
      average: string;
      median: string;
      p25: string;
      p75: string;
      p90: string;
    }>();

    const count = Number(row?.count ?? 0);
    if (count === 0) return EMPTY_SALARY_STATS;

    return {
      count,
      average: Math.round(Number(row?.average ?? 0)),
      median: Math.round(Number(row?.median ?? 0)),
      p25: Math.round(Number(row?.p25 ?? 0)),
      p75: Math.round(Number(row?.p75 ?? 0)),
      p90: Math.round(Number(row?.p90 ?? 0)),
    };
  }

  async getPercentileRank(
    monthlySalaryClp: number,
    filter: SalaryStatsFilter,
  ): Promise<SalaryPercentileRank> {
    const qb = this.repository
      .createQueryBuilder('s')
      .select('COUNT(*) FILTER (WHERE s.monthlySalaryClp < :salary)', 'below')
      .addSelect('COUNT(*)', 'total')
      .setParameter('salary', monthlySalaryClp);

    this.applyFilter(qb, filter);

    const row = await qb.getRawOne<{ below: string; total: string }>();

    const below = Number(row?.below ?? 0);
    const total = Number(row?.total ?? 0);
    const percentile = total > 0 ? Math.round((below / total) * 100) : 0;

    return { percentile, total };
  }

  private applyFilter(
    qb: ReturnType<Repository<SalarySubmissionEntity>['createQueryBuilder']>,
    filter: SalaryStatsFilter,
  ): void {
    if (filter.profession) {
      qb.andWhere('s.profession = :profession', {
        profession: filter.profession,
      });
    }
    if (filter.industry) {
      qb.andWhere('s.industry = :industry', { industry: filter.industry });
    }
    if (filter.region) {
      qb.andWhere('s.region = :region', { region: filter.region });
    }
  }
}

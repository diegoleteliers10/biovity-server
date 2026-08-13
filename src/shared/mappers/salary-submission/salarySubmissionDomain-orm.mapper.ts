import { SalarySubmission } from '../../../core/domain/entities/salary-submission.entity';
import { SalarySubmissionEntity } from '../../../infrastructure/database/orm/salary-submission.entity';

export class SalarySubmissionDomainOrmMapper {
  static toOrm(domain: SalarySubmission): SalarySubmissionEntity {
    const orm = new SalarySubmissionEntity();
    orm.id = domain.id;
    orm.profession = domain.profession;
    orm.industry = domain.industry;
    orm.experienceYears = domain.experienceYears;
    orm.experienceLevel = domain.experienceLevel;
    orm.educationLevel = domain.educationLevel;
    orm.region = domain.region;
    orm.workMode = domain.workMode;
    orm.monthlySalaryClp = domain.monthlySalaryClp;
    orm.annualBonusClp = domain.annualBonusClp;
    orm.benefits = domain.benefits;
    orm.skills = domain.skills;
    orm.isVerified = domain.isVerified;
    orm.createdAt = domain.createdAt;
    return orm;
  }

  static toDomain(entity: SalarySubmissionEntity): SalarySubmission {
    return new SalarySubmission(
      entity.id,
      entity.profession,
      entity.industry,
      entity.experienceYears,
      entity.experienceLevel,
      entity.educationLevel,
      entity.region,
      entity.workMode,
      entity.monthlySalaryClp,
      entity.annualBonusClp,
      entity.benefits,
      entity.skills,
      entity.isVerified,
      entity.createdAt,
    );
  }
}

import { JobCreateDto } from '../../../interfaces/dtos/job/job-create.dto';
import { CreateJobInput } from '../../../core/use-cases/job/job.use-case';
import {
  JobEmploymentType,
  JobExperienceLevel,
  JobStatus,
} from '../../../core/domain/enums';

export class JobDtoDomainMapper {
  static toCreateJobInput(dto: JobCreateDto): CreateJobInput {
    return {
      organizationId: dto.organizationId,
      title: dto.title,
      description: dto.description,
      employmentType: dto.employmentType,
      experienceLevel: dto.experienceLevel,
      salary: dto.salary as unknown as Record<string, unknown> | undefined,
      location: dto.location as unknown as Record<string, unknown> | undefined,
      benefits: dto.benefits as unknown as
        | Record<string, unknown>[]
        | undefined,
      status: dto.status,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      category: dto.category,
    };
  }

  static toJobEmploymentType(value: string): JobEmploymentType {
    return JobEmploymentType[value as keyof typeof JobEmploymentType];
  }

  static toJobExperienceLevel(value: string): JobExperienceLevel {
    return JobExperienceLevel[value as keyof typeof JobExperienceLevel];
  }

  static toJobStatus(value: string): JobStatus {
    return JobStatus[value as keyof typeof JobStatus];
  }
}

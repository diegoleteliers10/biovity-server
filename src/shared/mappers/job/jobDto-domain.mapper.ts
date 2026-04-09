import {
  JobCreateDto,
  JobEmploymentType,
  JobExperienceLevel,
  JobStatus,
} from '../../../interfaces/dtos/job/job-create.dto';
import { CreateJobInput } from '../../../core/use-cases/job/job.use-case';

export class JobDtoDomainMapper {
  static toCreateJobInput(dto: JobCreateDto): CreateJobInput {
    return {
      organizationId: dto.organizationId,
      title: dto.title,
      description: dto.description,
      employmentType: dto.employmentType as unknown as string,
      experienceLevel: dto.experienceLevel as unknown as string,
      salary: dto.salary as unknown as Record<string, unknown> | undefined,
      location: dto.location as unknown as Record<string, unknown> | undefined,
      benefits: dto.benefits as unknown as
        | Record<string, unknown>[]
        | undefined,
      status: dto.status as unknown as string | undefined,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
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

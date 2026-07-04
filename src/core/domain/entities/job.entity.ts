import { JobStatus, JobEmploymentType, JobExperienceLevel } from '../enums';

export interface JobSalary {
  min?: number;
  max?: number;
  currency?: string;
  period?: string;
  isNegotiable?: boolean;
}

export interface JobLocation {
  city?: string;
  state?: string;
  country?: string;
  isRemote?: boolean;
  isHybrid?: boolean;
}

export interface JobBenefits {
  tipo: string;
  title: string;
}

export class Job {
  constructor(
    public id: string,
    public organizationId: string,
    public title: string,
    public description: string,
    public employmentType: JobEmploymentType,
    public experienceLevel: JobExperienceLevel,
    public benefits: JobBenefits[] = [],
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
    public salary: JobSalary = {},
    public status: JobStatus = JobStatus.DRAFT,
    public views: number = 0,
    public expiresAt?: Date,
    public location: JobLocation = {},
    public category?: string,
  ) {}

  public isActive(): boolean {
    return (
      this.status === JobStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date())
    );
  }

  public canReceiveApplications(): boolean {
    return this.isActive();
  }

  public isRemoteWork(): boolean {
    return this.location.isRemote ?? false;
  }
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export enum JobEmploymentType {
  FULL_TIME = 'Full-time',
  PART_TIME = 'Part-time',
  CONTRATO = 'Contrato',
  PRACTICA = 'Practica',
}

export enum JobExperienceLevel {
  ENTRANTE = 'Entrante',
  JUNIOR = 'Junior',
  MID_SENIOR = 'Mid-Senior',
  SENIOR = 'Senior',
  EJECUTIVO = 'Ejecutivo',
}

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
    public applicationsCount: number = 0,
    public expiresAt?: Date,
    public location: JobLocation = {},
  ) {}

  public isActive(): boolean {
    return (
      this.status === JobStatus.ACTIVE &&
      (!this.expiresAt || this.expiresAt > new Date())
    );
  }

  public incrementApplicationsCount(): void {
    this.applicationsCount += 1;
  }

  public canReceiveApplications(): boolean {
    return this.isActive();
  }

  public isRemoteWork(): boolean {
    return this.location.isRemote ?? false;
  }
}

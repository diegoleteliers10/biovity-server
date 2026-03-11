import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { ApplicationEntity } from './application.entity';

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

@Entity('job')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  public organization: OrganizationEntity;

  @Column({ nullable: false })
  public title: string;

  @Column({ type: 'text', nullable: false })
  public description: string;

  @Column({
    type: 'enum',
    enum: JobEmploymentType,
    nullable: false,
  })
  public employmentType: JobEmploymentType;

  @Column({
    type: 'enum',
    enum: JobExperienceLevel,
    nullable: false,
  })
  public experienceLevel: JobExperienceLevel;

  @Column({ type: 'json', nullable: true })
  public benefits: JobBenefits[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({ type: 'json', nullable: false })
  public salary: JobSalary;

  @Column({
    type: 'enum',
    enum: JobStatus,
    default: JobStatus.DRAFT,
  })
  public status: JobStatus;

  @Column({ default: 0 })
  public applicationsCount: number;

  @Column({ type: 'timestamp', nullable: true })
  public expiresAt?: Date;

  @Column({ type: 'json', nullable: false })
  public location: JobLocation;

  @OneToMany(() => ApplicationEntity, application => application.job)
  public applications: ApplicationEntity[];
}

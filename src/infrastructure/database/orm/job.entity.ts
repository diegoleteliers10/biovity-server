import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { ApplicationEntity } from './application.entity';
import {
  JobStatus,
  JobEmploymentType,
  JobExperienceLevel,
} from '../../../core/domain/enums';

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
@Index('idx_job_organizationId', ['organizationId'])
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
  public views: number;

  @Column({ type: 'timestamp', nullable: true })
  public expiresAt?: Date;

  @Column({ type: 'json', nullable: false })
  public location: JobLocation;

  @Column({ nullable: true })
  public category?: string;

  @OneToMany(() => ApplicationEntity, application => application.job)
  public applications: ApplicationEntity[];
}

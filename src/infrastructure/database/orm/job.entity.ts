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

export enum BenefitType {
  HEALTH = 'health',
  FINANCIAL = 'financial',
  TIME_OFF = 'time_off',
  PROFESSIONAL = 'professional',
  LIFESTYLE = 'lifestyle',
  TECHNOLOGY = 'technology',
  TRANSPORTATION = 'transportation',
  FAMILY = 'family',
  OTHER = 'other',
}

export interface BenefitMetadata {
  type: BenefitType;
  icon: string;
  color?: string;
  priority?: number;
}

export interface Benefits {
  title: string;
  description?: string;
  metadata?: BenefitMetadata;
  isCustom?: boolean;
}

export enum JobStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  CLOSED = 'closed',
  EXPIRED = 'expired',
}

export enum Currency {
  USD = 'USD',
  CLP = 'CLP',
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

  @Column({ type: 'json', nullable: false })
  public salary: {
    min: number;
    max: number;
    currency: Currency;
    period: 'hourly' | 'monthly' | 'yearly';
    isNegotiable?: boolean;
  };

  @Column({ type: 'json', nullable: false })
  public location: {
    city?: string;
    state?: string;
    country: string;
    isRemote: boolean;
    isHybrid?: boolean;
  };

  @Column({
    type: 'enum',
    enum: ['Full-time', 'Part-time', 'Contrato', 'Practica'],
    nullable: false,
  })
  public employmentType: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica';

  @Column({
    type: 'enum',
    enum: ['Entrante', 'Junior', 'Mid-Senior', 'Senior', 'Ejecutivo'],
    nullable: false,
  })
  public experienceLevel:
    | 'Entrante'
    | 'Junior'
    | 'Mid-Senior'
    | 'Senior'
    | 'Ejecutivo';

  @Column({ type: 'json', nullable: true })
  public benefits: Benefits[];

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

  @OneToMany(() => ApplicationEntity, application => application.job)
  public applications: ApplicationEntity[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;
}

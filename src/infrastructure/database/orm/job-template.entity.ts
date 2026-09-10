import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import type { JobSalary, JobLocation, JobBenefits } from './job.entity';

@Entity('job_template')
@Index('idx_job_template_organizationId', ['organizationId'])
export class JobTemplateEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'organization_id', nullable: false, type: 'uuid' })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  public organization: OrganizationEntity;

  @Column({ nullable: false })
  public name: string;

  @Column({ nullable: false })
  public title: string;

  @Column({ type: 'text', nullable: false })
  public description: string;

  @Column({ name: 'employment_type', nullable: true })
  public employmentType?: string;

  @Column({ name: 'experience_level', nullable: true })
  public experienceLevel?: string;

  @Column({ type: 'json', nullable: true })
  public salary?: JobSalary;

  @Column({ type: 'json', nullable: true })
  public location?: JobLocation;

  @Column({ type: 'json', nullable: true })
  public benefits?: JobBenefits[];

  @Column({
    name: 'required_skills',
    type: 'jsonb',
    nullable: true,
    default: '[]',
  })
  public requiredSkills?: string[];

  @Column({ name: 'min_experience', type: 'int', nullable: true, default: 0 })
  public minExperience?: number;

  @Column({ nullable: true })
  public category?: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { UserEntity } from './user.entity';
import { ApplicationAnswerEntity } from './application-answer.entity';
import { ApplicationStatus } from '../../../core/domain/enums';
import { PipelineStageEntity } from './pipeline-stage.entity';
import type {
  ApplicationSourceChannel,
  ApplicationSourceMethod,
} from '../../../core/domain/application-source';

@Entity('application')
@Unique(['jobId', 'candidateId'])
@Index('idx_application_jobId', ['jobId'])
@Index('idx_application_candidateId', ['candidateId'])
@Index('idx_application_status', ['status'])
@Index('idx_application_source_cohort', [
  'jobId',
  'sourceChannel',
  'sourceMethod',
  'createdAt',
])
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public jobId: string;

  @ManyToOne(() => JobEntity)
  @JoinColumn({ name: 'jobId' })
  public job: JobEntity;

  @Column({ nullable: false })
  public candidateId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'candidateId' })
  public candidate: UserEntity;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDIENTE,
  })
  public status: ApplicationStatus;

  @Column({ type: 'timestamp', default: () => 'now()' })
  public stageChangedAt: Date;

  @Column({ name: 'pipeline_stage_id', type: 'uuid', nullable: false })
  public pipelineStageId: string | null;

  @ManyToOne(() => PipelineStageEntity)
  @JoinColumn([
    { name: 'jobId', referencedColumnName: 'jobId' },
    { name: 'pipeline_stage_id', referencedColumnName: 'id' },
  ])
  public pipelineStage: PipelineStageEntity | null;

  @Column({ name: 'assignee_id', type: 'uuid', nullable: true })
  public assigneeId: string | null;

  @Column({ name: 'next_action', type: 'text', nullable: true })
  public nextAction: string | null;

  @Column({ name: 'target_date', type: 'date', nullable: true })
  public targetDate: string | null;

  @Column({ name: 'cover_letter', type: 'text', nullable: true })
  public coverLetter?: string;

  @Column({ name: 'salary_min', type: 'integer', nullable: true })
  public salaryMin?: number;

  @Column({ name: 'salary_max', type: 'integer', nullable: true })
  public salaryMax?: number;

  @Column({ name: 'salary_currency', type: 'text', default: 'USD' })
  public salaryCurrency: string = 'USD';

  @Column({ name: 'availability_date', type: 'date', nullable: true })
  public availabilityDate?: string;

  @Column({ name: 'resume_url', type: 'text', nullable: true })
  public resumeUrl?: string;

  @Column({ name: 'source_channel', type: 'text', default: 'unknown' })
  public sourceChannel: ApplicationSourceChannel = 'unknown';

  @Column({ name: 'source_method', type: 'text', default: 'unknown' })
  public sourceMethod: ApplicationSourceMethod = 'unknown';

  @Column({ name: 'distribution_source_id', type: 'uuid', nullable: true })
  public distributionSourceId: string | null = null;

  @OneToMany(() => ApplicationAnswerEntity, answer => answer.application)
  public answers: ApplicationAnswerEntity[];
}

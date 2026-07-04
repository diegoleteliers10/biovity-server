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
import { JobEntity } from './job.entity';
import { OrganizationEntity } from './organization.entity';
import { QuestionType, QuestionStatus } from '../../../core/domain/enums';

@Entity('job_question')
@Index('idx_job_question_job_id', ['jobId'])
@Index('idx_job_question_organization_id', ['organizationId'])
export class JobQuestionEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'job_id', nullable: false })
  public jobId: string;

  @ManyToOne(() => JobEntity)
  @JoinColumn({ name: 'job_id' })
  public job: JobEntity;

  @Column({ name: 'organization_id', nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organization_id' })
  public organization: OrganizationEntity;

  @Column({ type: 'text', nullable: false })
  public label: string;

  @Column({ type: 'text', nullable: true })
  public placeholder?: string;

  @Column({ name: 'helper_text', type: 'text', nullable: true })
  public helperText?: string;

  @Column({
    type: 'text',
    nullable: false,
  })
  public type: QuestionType;

  @Column({ type: 'jsonb', nullable: true })
  public options?: string[];

  @Column({ type: 'boolean', default: false })
  public required: boolean = false;

  @Column({ name: 'order_index', type: 'integer', default: 0 })
  public orderIndex: number = 0;

  @Column({
    type: 'text',
    default: QuestionStatus.DRAFT,
  })
  public status: QuestionStatus = QuestionStatus.DRAFT;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}

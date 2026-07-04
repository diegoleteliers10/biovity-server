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

@Entity('application')
@Unique(['jobId', 'candidateId'])
@Index('idx_application_jobId', ['jobId'])
@Index('idx_application_candidateId', ['candidateId'])
@Index('idx_application_status', ['status'])
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

  @OneToMany(() => ApplicationAnswerEntity, answer => answer.application)
  public answers: ApplicationAnswerEntity[];
}

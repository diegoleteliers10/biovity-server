import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { ApplicationEntity } from './application.entity';
import { UserEntity } from './user.entity';
import type { EvaluationRating } from '../../../core/domain/entities/application-evaluation';

@Entity('application_evaluation')
@Unique('uq_eval_app_evaluator', ['applicationId', 'evaluatorId'])
@Index('idx_app_eval_application', ['applicationId'])
export class ApplicationEvaluationEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  public applicationId: string;

  @ManyToOne(() => ApplicationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  public application: ApplicationEntity;

  @Column({ name: 'evaluator_id', type: 'uuid' })
  public evaluatorId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'evaluator_id' })
  public evaluator: UserEntity;

  @Column({ type: 'enum', enum: ['positive', 'neutral', 'negative'], enumName: 'evaluation_rating' })
  public rating: EvaluationRating;

  @Column({ type: 'text', nullable: true })
  public notes: string | null;

  @Column({ name: 'skills_assessment', type: 'jsonb', default: () => "'{}'::jsonb" })
  public skillsAssessment: Record<string, string>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  public updatedAt: Date;
}

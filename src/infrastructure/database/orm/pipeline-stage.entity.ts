import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
} from 'typeorm';
import { JobEntity } from './job.entity';

@Entity('pipeline_stage')
@Index('idx_pipeline_stage_job_id', ['jobId'])
@Unique('uq_pipeline_stage_job_name', ['jobId', 'name'])
export class PipelineStageEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'job_id', type: 'uuid', nullable: false })
  public jobId: string;

  @ManyToOne(() => JobEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id' })
  public job: JobEntity;

  @Column({ nullable: false })
  public name: string;

  @Column({ default: 0 })
  public order: number;

  @Column({ default: '#6366f1' })
  public color: string;
}

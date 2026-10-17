import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
  Unique,
  Check,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { ApplicationStatus } from '../../../core/domain/enums';

@Entity('pipeline_stage')
@Index('idx_pipeline_stage_job_id', ['jobId'])
@Unique('uq_pipeline_stage_job_name', ['jobId', 'name'])
@Unique('uq_pipeline_stage_id_job_id', ['id', 'jobId'])
@Unique('uq_pipeline_stage_job_system_key', ['jobId', 'systemKey'])
@Check('ck_pipeline_stage_status_projection', `"status_projection" IN ('pendiente', 'entrevista', 'oferta', 'contratado', 'rechazado', 'desistido')`)
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

  @Column({ name: 'status_projection', type: 'varchar', default: 'pendiente' })
  public statusProjection: ApplicationStatus;

  @Column({ name: 'system_key', type: 'varchar', nullable: true })
  public systemKey: string | null;

  @Column({ name: 'is_archived', type: 'boolean', default: false })
  public isArchived: boolean;

  @Column({ name: 'current_rubric_version_id', type: 'uuid', nullable: true })
  public currentRubricVersionId: string | null;
}

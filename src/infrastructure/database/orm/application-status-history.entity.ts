import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ApplicationEntity } from './application.entity';
import { UserEntity } from './user.entity';

@Entity('application_status_history')
@Index('idx_application_status_history_application', ['applicationId'])
@Index('idx_application_status_history_new_status', ['newStatus'])
@Index('idx_application_status_history_changed_at', ['changedAt'])
export class ApplicationStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'application_id', type: 'uuid', nullable: false })
  public applicationId: string;

  @ManyToOne(() => ApplicationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  public application: ApplicationEntity;

  @Column({ name: 'previous_status', type: 'varchar', nullable: true })
  public previousStatus: string | null;

  @Column({ name: 'new_status', type: 'varchar', nullable: false })
  public newStatus: string;

  @Column({ name: 'changed_at', type: 'timestamp', default: () => 'now()' })
  public changedAt: Date;

  @Column({ name: 'changed_by_id', type: 'uuid', nullable: true })
  public changedById: string | null;

  @Column({ name: 'rejection_note', type: 'text', nullable: true })
  public rejectionNote: string | null;

  @Column({ name: 'rejection_reason_id', type: 'uuid', nullable: true })
  public rejectionReasonId: string | null;

  @Column({
    name: 'rejection_reason_snapshot',
    type: 'varchar',
    length: 120,
    nullable: true,
  })
  public rejectionReasonSnapshot: string | null;

  @Column({ name: 'previous_stage_id', type: 'uuid', nullable: true })
  public previousStageId: string | null;

  @Column({ name: 'new_stage_id', type: 'uuid', nullable: true })
  public newStageId: string | null;

  @Column({ name: 'previous_stage_name', type: 'varchar', nullable: true })
  public previousStageName: string | null;

  @Column({ name: 'new_stage_name', type: 'varchar', nullable: true })
  public newStageName: string | null;

  @Column({ name: 'transition_kind', type: 'varchar', default: 'stage' })
  public transitionKind: 'stage' | 'reopen';

  @Column({ name: 'transition_note', type: 'text', nullable: true })
  public transitionNote: string | null;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_id' })
  public changedBy: UserEntity | null;
}

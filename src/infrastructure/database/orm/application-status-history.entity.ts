import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
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

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'changed_by_id' })
  public changedBy: UserEntity | null;
}

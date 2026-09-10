import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { JobAlertFrequency } from '../../../core/domain/enums';

@Entity('job_alert')
@Index('idx_job_alert_user_id', ['userId'])
export class JobAlertEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  public userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;

  @Column({ type: 'text', nullable: true })
  public keywords: string | null;

  @Column({ type: 'text', nullable: true })
  public location: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  public category: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    nullable: false,
    default: JobAlertFrequency.INSTANTANEA,
  })
  public frequency: JobAlertFrequency;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}

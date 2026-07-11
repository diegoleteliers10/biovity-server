import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { UserEntity } from './user.entity';

@Entity('activity_log')
@Index('idx_activity_log_org', ['organizationId'])
@Index('idx_activity_log_user', ['userId'])
export class ActivityLogEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  public organization: OrganizationEntity;

  @Column({ name: 'user_id', type: 'uuid', nullable: false })
  public userId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;

  @Column({ nullable: false })
  public action: string;

  @Column({ type: 'text', nullable: false })
  public description: string;

  @Column({ type: 'jsonb', nullable: true, default: '{}' })
  public metadata?: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;
}

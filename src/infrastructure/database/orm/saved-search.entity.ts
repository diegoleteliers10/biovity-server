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
import { OrganizationEntity } from './organization.entity';

@Entity('saved_search')
@Index('idx_saved_search_organization_id', ['organizationId'])
export class SavedSearchEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  public organization: OrganizationEntity;

  @Column({ nullable: false })
  public name: string;

  @Column({ type: 'jsonb', nullable: false, default: '{}' })
  public filters: Record<string, unknown>;

  @Column({ name: 'notify_enabled', default: false })
  public notifyEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}

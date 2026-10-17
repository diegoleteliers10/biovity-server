import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

@Entity('organization_rejection_reason')
@Index('idx_organization_rejection_reason_org', ['organizationId'])
export class OrganizationRejectionReasonEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'organization_id', type: 'uuid' })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  public organization: OrganizationEntity;

  @Column({ type: 'varchar', length: 120 })
  public label: string;

  @Column({ name: 'sort_order', type: 'integer', default: 0 })
  public sortOrder: number;

  @Column({ type: 'boolean', default: true })
  public active: boolean;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}

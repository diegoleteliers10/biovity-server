import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  Unique,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { UserEntity } from './user.entity';
import { OrganizationMemberRole } from '../../../core/domain/entities/organization-member.entity';

@Entity('organization_member')
@Index('idx_org_member_org', ['organizationId'])
@Index('idx_org_member_user', ['userId'])
@Unique('uq_org_member_org_user', ['organizationId', 'userId'])
export class OrganizationMemberEntity {
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

  @Column({
    type: 'enum',
    enum: OrganizationMemberRole,
    default: OrganizationMemberRole.VIEWER,
  })
  public role: OrganizationMemberRole;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  public updatedAt: Date;
}

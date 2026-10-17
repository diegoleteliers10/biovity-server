import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { MessageEntity } from './message.entity';
import { OrganizationEntity } from './organization.entity';

@Entity('chat')
@Index('idx_chat_recruiterId', ['recruiterId'])
@Index('idx_chat_professionalId', ['professionalId'])
@Index('idx_chat_organizationId', ['organizationId'])
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public recruiterId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'recruiterId' })
  public recruiter: UserEntity;

  @Column({ nullable: false })
  public professionalId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'professionalId' })
  public professional: UserEntity;

  @Column({ type: 'uuid', nullable: true })
  public organizationId: string | null;

  @ManyToOne(() => OrganizationEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'organizationId' })
  public organization?: OrganizationEntity | null;

  @Column({ name: 'organization_assignment_actor_id', type: 'uuid', nullable: true })
  public organizationAssignmentActorId: string | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'organization_assignment_actor_id' })
  public organizationAssignmentActor?: UserEntity | null;

  @Column({ name: 'organization_assigned_at', type: 'timestamptz', nullable: true })
  public organizationAssignedAt: Date | null;

  @Column({ nullable: true })
  public lastMessage?: string;

  @Column({ default: 0 })
  public unreadCountRecruiter: number;

  @Column({ default: 0 })
  public unreadCountProfessional: number;

  @Column({ name: 'is_pinned_recruiter', default: false })
  public isPinnedByRecruiter: boolean;

  @Column({ name: 'is_pinned_professional', default: false })
  public isPinnedByProfessional: boolean;

  @Column({ name: 'is_archived_recruiter', default: false })
  public isArchivedByRecruiter: boolean;

  @Column({ name: 'is_archived_professional', default: false })
  public isArchivedByProfessional: boolean;

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt?: Date;

  @OneToMany(() => MessageEntity, message => message.chat)
  public messages: MessageEntity[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { UserEntity } from './user.entity';

@Entity('saved_candidate')
@Unique(['organizationId', 'candidateId'])
@Index('idx_saved_candidate_org', ['organizationId'])
@Index('idx_saved_candidate_candidate', ['candidateId'])
export class SavedCandidateEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  public organization: OrganizationEntity;

  @Column({ name: 'candidate_id', type: 'uuid', nullable: false })
  public candidateId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  public candidate: UserEntity;

  @Column({ type: 'text', nullable: true })
  public note?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;
}

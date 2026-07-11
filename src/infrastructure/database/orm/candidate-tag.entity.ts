import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
  Index,
  OneToMany,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { CandidateTagAssignmentEntity } from './candidate-tag-assignment.entity';

@Entity('candidate_tag')
@Unique(['organizationId', 'name'])
@Index('idx_candidate_tag_org', ['organizationId'])
export class CandidateTagEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'organization_id', type: 'uuid', nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'organization_id' })
  public organization: OrganizationEntity;

  @Column({ length: 100, nullable: false })
  public name: string;

  @Column({ length: 7, default: '#6366f1' })
  public color: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;

  @OneToMany(
    () => CandidateTagAssignmentEntity,
    assignment => assignment.tag,
  )
  public assignments: CandidateTagAssignmentEntity[];
}

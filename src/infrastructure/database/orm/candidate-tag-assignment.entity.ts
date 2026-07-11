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
import { CandidateTagEntity } from './candidate-tag.entity';
import { UserEntity } from './user.entity';

@Entity('candidate_tag_assignment')
@Unique(['tagId', 'candidateId'])
@Index('idx_candidate_tag_assignment_tag', ['tagId'])
@Index('idx_candidate_tag_assignment_candidate', ['candidateId'])
export class CandidateTagAssignmentEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'tag_id', type: 'uuid', nullable: false })
  public tagId: string;

  @ManyToOne(() => CandidateTagEntity, tag => tag.assignments, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'tag_id' })
  public tag: CandidateTagEntity;

  @Column({ name: 'candidate_id', type: 'uuid', nullable: false })
  public candidateId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id' })
  public candidate: UserEntity;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;
}

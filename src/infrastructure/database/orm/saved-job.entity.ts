import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { UserEntity } from './user.entity';

@Entity('saved_job')
@Unique(['userId', 'jobId']) // Prevent duplicate saves for same job by same user
export class SavedJobEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  public user: UserEntity;

  @Column({ nullable: false })
  public jobId: string;

  @ManyToOne(() => JobEntity)
  @JoinColumn({ name: 'jobId' })
  public job: JobEntity;

  @CreateDateColumn()
  public createdAt: Date;
}

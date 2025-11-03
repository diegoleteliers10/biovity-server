import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { JobEntity } from './job.entity';
import { UserEntity } from './user.entity';

export enum ApplicationStatus {
  PENDING = 'pendiente',
  OFFER = 'oferta',
  INTERVIEW = 'entrevista',
  REJECTED = 'rechazado',
  HIRED = 'contratado',
}

@Entity('application')
export class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public jobId: string;

  @ManyToOne(() => JobEntity)
  @JoinColumn({ name: 'jobId' })
  public job: JobEntity;

  @Column({ nullable: false })
  public candidateId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'candidateId' })
  public candidate: UserEntity;

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;

  @Column({
    type: 'enum',
    enum: ApplicationStatus,
    default: ApplicationStatus.PENDING,
  })
  public status: ApplicationStatus;
}

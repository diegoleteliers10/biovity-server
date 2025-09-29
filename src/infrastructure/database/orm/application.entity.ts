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
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();

  @Column()
  public status:
    | 'pendiente'
    | 'oferta'
    | 'entrevista'
    | 'rechazado'
    | 'contratado' = 'pendiente';
}

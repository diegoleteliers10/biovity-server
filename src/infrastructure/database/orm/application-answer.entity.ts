import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Unique,
} from 'typeorm';
import { ApplicationEntity } from './application.entity';
import { JobQuestionEntity } from './job-question.entity';

@Entity('application_answer')
@Unique(['applicationId', 'questionId'])
export class ApplicationAnswerEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'application_id', nullable: false })
  public applicationId: string;

  @ManyToOne(() => ApplicationEntity)
  @JoinColumn({ name: 'application_id' })
  public application: ApplicationEntity;

  @Column({ name: 'question_id', nullable: false })
  public questionId: string;

  @ManyToOne(() => JobQuestionEntity)
  @JoinColumn({ name: 'question_id' })
  public question: JobQuestionEntity;

  @Column({ type: 'text', nullable: false })
  public value: string;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { ApplicationEntity } from './application.entity';

export enum EventType {
  INTERVIEW = 'interview',
  TASK_DEADLINE = 'task_deadline',
  ANNOUNCEMENT = 'announcement',
  ONBOARDING = 'onboarding',
}

export enum EventStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('event')
export class EventEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'text' })
  public title: string;

  @Column({ type: 'text', nullable: true })
  public description: string | null;

  @Column({ type: 'text' })
  public type: EventType;

  @Column({ type: 'timestamptz' })
  public startAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  public endAt: Date | null;

  @Column({ type: 'text', nullable: true })
  public location: string | null;

  @Column({ type: 'text', nullable: true })
  public meetingUrl: string | null;

  @Column({ type: 'text', default: EventStatus.SCHEDULED })
  public status: EventStatus;

  @Column({ type: 'uuid' })
  public organizerId: string;

  @Column({ type: 'uuid', nullable: true })
  public candidateId: string | null;

  @Column({ type: 'uuid', nullable: true })
  public applicationId: string | null;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'organizerId' })
  public organizer: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'candidateId' })
  public candidate: UserEntity;

  @ManyToOne(() => ApplicationEntity, { nullable: true })
  @JoinColumn({ name: 'applicationId' })
  public application: ApplicationEntity;

  @OneToMany(() => EventNoteEntity, en => en.event)
  public notes: EventNoteEntity[];

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @CreateDateColumn()
  public updatedAt: Date = new Date();
}

@Entity('event_note')
export class EventNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'uuid' })
  public eventId: string;

  @Column({ type: 'uuid' })
  public authorId: string;

  @Column({ type: 'text' })
  public content: string;

  @ManyToOne(() => EventEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventId' })
  public event: EventEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'authorId' })
  public author: UserEntity;

  @CreateDateColumn()
  public createdAt: Date = new Date();
}
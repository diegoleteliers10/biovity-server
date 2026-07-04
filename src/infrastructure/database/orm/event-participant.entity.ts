import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { EventEntity } from './event.entity';
import { UserEntity } from './user.entity';
import { ParticipantRole, ParticipantStatus } from '../../../core/domain/enums';

@Entity('event_participant')
@Index('idx_event_participant_event', ['eventId'])
@Index('idx_event_participant_user', ['userId'])
export class EventParticipantEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  public eventId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  public userId: string;

  @Column({
    type: 'enum',
    enum: ParticipantRole,
    default: ParticipantRole.ATTENDEE,
  })
  public role: ParticipantRole;

  @Column({
    type: 'enum',
    enum: ParticipantStatus,
    default: ParticipantStatus.PENDING,
  })
  public status: ParticipantStatus;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date = new Date();

  @ManyToOne(() => EventEntity, event => event.participants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'event_id' })
  public event: EventEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;
}

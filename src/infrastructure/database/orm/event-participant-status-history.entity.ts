import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ParticipantStatus } from '../../../core/domain/enums';

@Entity('event_participant_status_history')
@Index('idx_event_participant_status_history_participant_changed', [
  'participantId',
  'changedAt',
])
export class EventParticipantStatusHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'participant_id', type: 'uuid' })
  public participantId: string;

  @Column({ name: 'event_id', type: 'uuid' })
  public eventId: string;

  @Column({ name: 'user_id', type: 'uuid' })
  public userId: string;

  @Column({ name: 'changed_by_id', type: 'uuid' })
  public changedById: string;

  @Column({
    name: 'from_status',
    type: 'enum',
    enum: ParticipantStatus,
    enumName: 'event_participant_status_enum',
  })
  public fromStatus: ParticipantStatus;

  @Column({
    name: 'to_status',
    type: 'enum',
    enum: ParticipantStatus,
    enumName: 'event_participant_status_enum',
  })
  public toStatus: ParticipantStatus;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  public changedAt: Date;
}

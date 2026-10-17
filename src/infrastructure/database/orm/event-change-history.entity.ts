import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import type {
  EventChangeAction,
  EventChangeSet,
} from '../../../core/domain/entities/event-change-history';

@Entity('event_change_history')
@Index('idx_event_change_history_event_created', ['eventId', 'createdAt', 'id'])
export class EventChangeHistoryEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'event_id', type: 'uuid' })
  public eventId: string;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  public actorUserId: string | null;

  @Column({ type: 'text' })
  public action: EventChangeAction;

  @Column({ type: 'jsonb' })
  public changes: EventChangeSet;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;
}

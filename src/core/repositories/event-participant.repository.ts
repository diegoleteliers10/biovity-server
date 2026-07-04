import { EntityManager } from 'typeorm';
import { EventParticipant } from '../domain/entities/event-participant.entity';
import { ParticipantStatus } from '../domain/enums';

export interface IEventParticipantRepository {
  seedParticipants(
    manager: EntityManager,
    eventId: string,
    organizerId: string,
    candidateId?: string | null,
  ): Promise<void>;
  findByEventId(eventId: string): Promise<EventParticipant[]>;
  findUserIdsByEventId(
    eventId: string,
    excludeStatuses?: ParticipantStatus[],
  ): Promise<string[]>;
  findByEventAndUser(
    eventId: string,
    userId: string,
  ): Promise<EventParticipant | null>;
  updateStatus(
    eventId: string,
    userId: string,
    status: ParticipantStatus,
  ): Promise<EventParticipant | null>;
}

export const EVENT_PARTICIPANT_REPOSITORY = 'IEventParticipantRepository';

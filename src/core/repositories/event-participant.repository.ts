import { EntityManager } from 'typeorm';
import { EventParticipant } from '../domain/entities/event-participant.entity';
import { ParticipantStatus } from '../domain/enums';

export type EventInterviewerAssignment = {
  userId: string;
  roleId: string;
  roleLabel: string;
};

export interface IEventParticipantRepository {
  seedParticipants(
    manager: EntityManager,
    eventId: string,
    organizerId: string,
    candidateId?: string | null,
    interviewerIds?: readonly string[],
    isInterview?: boolean,
    interviewerAssignments?: readonly EventInterviewerAssignment[],
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
    changedById: string,
  ): Promise<ParticipantStatusUpdate | null>;
  findStatusHistory(
    eventId: string,
    userId: string,
  ): Promise<EventParticipantStatusHistory[]>;
}

export type EventParticipantStatusHistory = {
  id: string;
  fromStatus: ParticipantStatus;
  toStatus: ParticipantStatus;
  changedAt: Date;
};

export type ParticipantStatusUpdate =
  | { kind: 'closed' }
  | {
      kind: 'unchanged';
      status: ParticipantStatus;
    }
  | {
      kind: 'changed';
      fromStatus: ParticipantStatus;
      toStatus: ParticipantStatus;
      changedAt: Date;
    };

export const EVENT_PARTICIPANT_REPOSITORY = 'IEventParticipantRepository';

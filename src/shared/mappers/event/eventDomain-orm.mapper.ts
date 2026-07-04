import {
  EventEntity,
  EventNoteEntity,
  EventParticipantEntity,
} from '../../../infrastructure/database/orm';
import { Event, EventNote } from '../../../core/domain/entities/event.entity';
import { EventParticipant } from '../../../core/domain/entities/event-participant.entity';

export class EventDomainOrmMapper {
  static toOrm(domain: Event): EventEntity {
    const entity = new EventEntity();
    entity.id = domain.id;
    entity.title = domain.title;
    entity.description = domain.description;
    entity.type = domain.type;
    entity.startAt = domain.startAt;
    entity.endAt = domain.endAt;
    entity.location = domain.location;
    entity.meetingUrl = domain.meetingUrl;
    entity.status = domain.status;
    entity.organizerId = domain.organizerId;
    entity.organizationId = domain.organizationId;
    entity.candidateId = domain.candidateId;
    entity.applicationId = domain.applicationId;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }

  static toDomain(entity: EventEntity): Event {
    const event = new Event(
      entity.id,
      entity.title,
      entity.description,
      entity.type,
      entity.startAt,
      entity.endAt,
      entity.location,
      entity.meetingUrl,
      entity.status,
      entity.organizerId,
      entity.organizationId,
      entity.candidateId,
      entity.applicationId,
      entity.createdAt,
      entity.updatedAt,
      Array.isArray(entity.participants)
        ? entity.participants.map(p => this.participantToDomain(p))
        : [],
    );
    return event;
  }

  static participantToDomain(entity: EventParticipantEntity): EventParticipant {
    return new EventParticipant(
      entity.id,
      entity.eventId,
      entity.userId,
      entity.role,
      entity.status,
      entity.createdAt,
    );
  }

  static noteToOrm(domain: EventNote): EventNoteEntity {
    const entity = new EventNoteEntity();
    entity.id = domain.id;
    entity.eventId = domain.eventId;
    entity.authorId = domain.authorId;
    entity.content = domain.content;
    entity.createdAt = domain.createdAt;
    return entity;
  }

  static noteToDomain(entity: EventNoteEntity): EventNote {
    return new EventNote(
      entity.id,
      entity.eventId,
      entity.authorId,
      entity.content,
      entity.createdAt,
    );
  }
}

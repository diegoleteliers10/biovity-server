import { Event, EventNote } from '../../../core/domain/entities/event.entity';
import { EventResponseDto, EventNoteResponseDto } from '../../../interfaces/dtos/event/event.dto';

export class EventDomainDtoMapper {
  static toDto(domain: Event): EventResponseDto {
    const dto = new EventResponseDto();
    dto.id = domain.id;
    dto.title = domain.title;
    dto.description = domain.description;
    dto.type = domain.type as EventResponseDto['type'];
    dto.startAt = domain.startAt;
    dto.endAt = domain.endAt;
    dto.location = domain.location;
    dto.meetingUrl = domain.meetingUrl;
    dto.status = domain.status as EventResponseDto['status'];
    dto.organizerId = domain.organizerId;
    dto.organizationId = domain.organizationId;
    dto.candidateId = domain.candidateId;
    dto.applicationId = domain.applicationId;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
  }

  static noteToDto(domain: EventNote): EventNoteResponseDto {
    const dto = new EventNoteResponseDto();
    dto.id = domain.id;
    dto.eventId = domain.eventId;
    dto.authorId = domain.authorId;
    dto.content = domain.content;
    dto.createdAt = domain.createdAt;
    return dto;
  }
}

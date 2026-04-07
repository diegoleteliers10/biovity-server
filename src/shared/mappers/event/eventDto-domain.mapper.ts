import { EventCreateDto, EventUpdateDto } from '../../../interfaces/dtos/event/event.dto';
import { CreateEventInput, UpdateEventInput } from '../../../core/use-cases/event/event.use-case';
import { EventType, EventStatus } from '../../../core/domain/entities/event.entity';

export class EventDtoDomainMapper {
  static toCreateEventInput(dto: EventCreateDto): CreateEventInput {
    return {
      title: dto.title,
      description: dto.description,
      type: dto.type as unknown as EventType,
      startAt: new Date(dto.startAt),
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      location: dto.location,
      meetingUrl: dto.meetingUrl,
      organizerId: dto.organizerId,
      organizationId: dto.organizationId,
      candidateId: dto.candidateId,
      applicationId: dto.applicationId,
    };
  }

  static toUpdateEventInput(dto: EventUpdateDto): UpdateEventInput {
    const input: UpdateEventInput = {};

    if (dto.title !== undefined) input.title = dto.title;
    if (dto.description !== undefined) input.description = dto.description;
    if (dto.type !== undefined) input.type = dto.type as unknown as EventType;
    if (dto.startAt !== undefined) input.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) input.endAt = new Date(dto.endAt);
    if (dto.location !== undefined) input.location = dto.location;
    if (dto.meetingUrl !== undefined) input.meetingUrl = dto.meetingUrl;
    if (dto.status !== undefined) input.status = dto.status as unknown as EventStatus;

    return input;
  }
}

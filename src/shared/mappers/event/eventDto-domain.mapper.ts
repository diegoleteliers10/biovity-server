import {
  EventCreateDto,
  EventUpdateDto,
} from '../../../interfaces/dtos/event/event.dto';
import {
  CreateEventInput,
  UpdateEventInput,
} from '../../../core/use-cases/event/event.use-case';

export class EventDtoDomainMapper {
  static toCreateEventInput(dto: EventCreateDto): CreateEventInput {
    return {
      title: dto.title,
      description: dto.description,
      type: dto.type,
      calendarProvider: dto.calendarProvider ?? 'biovity',
      startAt: new Date(dto.startAt),
      timeZone: dto.timeZone ?? 'America/Santiago',
      endAt: dto.endAt ? new Date(dto.endAt) : undefined,
      location: dto.location,
      meetingUrl: dto.meetingUrl,
      organizerId: dto.organizerId,
      organizationId: dto.organizationId,
      candidateId: dto.candidateId,
      applicationId: dto.applicationId,
      interviewerIds: dto.interviewerIds ?? [],
      interviewerAssignments: dto.interviewerAssignments,
    };
  }

  static toUpdateEventInput(dto: EventUpdateDto): UpdateEventInput {
    const input: UpdateEventInput = {};

    if (dto.title !== undefined) input.title = dto.title;
    if (dto.description !== undefined) input.description = dto.description;
    if (dto.type !== undefined) input.type = dto.type;
    if (dto.timeZone !== undefined) input.timeZone = dto.timeZone;
    if (dto.startAt !== undefined) input.startAt = new Date(dto.startAt);
    if (dto.endAt !== undefined) input.endAt = new Date(dto.endAt);
    if (dto.location !== undefined) input.location = dto.location;
    if (dto.meetingUrl !== undefined) input.meetingUrl = dto.meetingUrl;
    if (dto.status !== undefined) input.status = dto.status;
    if (dto.calendarProvider !== undefined)
      input.calendarProvider = dto.calendarProvider;

    return input;
  }
}

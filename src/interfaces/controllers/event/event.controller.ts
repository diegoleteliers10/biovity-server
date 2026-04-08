import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { EventService } from '../../../core/services/event.service';
import { EventDtoDomainMapper } from '../../../shared/mappers/event/eventDto-domain.mapper';
import { EventDomainDtoMapper } from '../../../shared/mappers/event/eventDomain-dto.mapper';
import {
  EventCreateDto,
  EventUpdateDto,
  EventQueryDto,
  EventNoteCreateDto,
  EventResponseDto,
  EventNoteResponseDto,
} from '../../dtos/event/event.dto';

@ApiTags('events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createEvent(@Body() dto: EventCreateDto): Promise<EventResponseDto> {
    const input = EventDtoDomainMapper.toCreateEventInput(dto);
    const event = await this.eventService.createEvent(input);
    return EventDomainDtoMapper.toDto(event);
  }

  @Get(':id')
  async getEventById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventResponseDto | null> {
    const event = await this.eventService.getEventById(id);
    if (!event) return null;

    return EventDomainDtoMapper.toDto(event);
  }

  @Get()
  async getEvents(@Query() query: EventQueryDto): Promise<{
    data: EventResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const filters = {
      userId: query.userId,
      organizerId: query.organizerId,
      type: query.type,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };

    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.eventService.getEvents(filters, pagination);

    return {
      data: result.data.map(e => EventDomainDtoMapper.toDto(e)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Patch(':id')
  async updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EventUpdateDto,
  ): Promise<EventResponseDto | null> {
    const input = EventDtoDomainMapper.toUpdateEventInput(dto);
    const event = await this.eventService.updateEvent(id, input);
    return event ? EventDomainDtoMapper.toDto(event) : null;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteEvent(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.eventService.deleteEvent(id);
  }

  // Notes
  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  async createNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EventNoteCreateDto,
  ): Promise<EventNoteResponseDto> {
    const note = await this.eventService.createNote(id, dto);
    return EventDomainDtoMapper.noteToDto(note);
  }

  @Get(':id/notes')
  async getNotes(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventNoteResponseDto[]> {
    const notes = await this.eventService.getNotes(id);
    return notes.map(n => EventDomainDtoMapper.noteToDto(n));
  }
}

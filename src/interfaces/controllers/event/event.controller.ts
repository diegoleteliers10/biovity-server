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
  NotFoundException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
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
  RsvpUpdateDto,
} from '../../dtos/event/event.dto';

@ApiTags('events')
@Controller('events')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear evento' })
  @ApiResponse({ status: 201, description: 'Evento creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createEvent(@Body() dto: EventCreateDto): Promise<EventResponseDto> {
    const input = EventDtoDomainMapper.toCreateEventInput(dto);
    const event = await this.eventService.createEvent(input);
    return EventDomainDtoMapper.toDto(event);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener evento por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Evento encontrado' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async getEventById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventResponseDto> {
    const event = await this.eventService.getEventById(id);
    if (!event) throw new NotFoundException('Event not found');

    return EventDomainDtoMapper.toDto(event);
  }

  @Get()
  @ApiOperation({ summary: 'Listar eventos con filtros y paginación' })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'organizerId', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de eventos' })
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
  @ApiOperation({ summary: 'Actualizar evento' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Evento actualizado' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async updateEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EventUpdateDto,
  ): Promise<EventResponseDto> {
    const input = EventDtoDomainMapper.toUpdateEventInput(dto);
    const event = await this.eventService.updateEvent(id, input);
    if (!event) throw new NotFoundException('Event not found');
    return EventDomainDtoMapper.toDto(event);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar evento' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Evento eliminado' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async deleteEvent(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.eventService.deleteEvent(id);
  }

  @Patch(':id/participants/:userId')
  @ApiOperation({ summary: 'Actualizar RSVP de un participante' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'RSVP actualizado' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async updateParticipantStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: RsvpUpdateDto,
  ): Promise<EventResponseDto> {
    const event = await this.eventService.updateParticipantStatus(
      id,
      userId,
      dto.status,
    );
    if (!event) throw new NotFoundException('Event not found');
    return EventDomainDtoMapper.toDto(event);
  }

  // Notes
  @Post(':id/notes')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Agregar nota a un evento' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Nota creada' })
  @ApiResponse({ status: 404, description: 'Evento no encontrado' })
  async createNote(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EventNoteCreateDto,
  ): Promise<EventNoteResponseDto> {
    const note = await this.eventService.createNote(id, dto);
    return EventDomainDtoMapper.noteToDto(note);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Listar notas de un evento' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de notas' })
  async getNotes(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<EventNoteResponseDto[]> {
    const notes = await this.eventService.getNotes(id);
    return notes.map(n => EventDomainDtoMapper.noteToDto(n));
  }
}

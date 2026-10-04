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
  ForbiddenException,
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
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { isAdminUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
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
  constructor(
    private readonly eventService: EventService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear evento' })
  @ApiResponse({ status: 201, description: 'Evento creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createEvent(
    @Body() dto: EventCreateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<EventResponseDto> {
    await this.organizationAccess.assertEventCreation(requester, dto);
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
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<EventResponseDto> {
    await this.organizationAccess.assertEventAccess(id, requester, 'read');
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
  async getEvents(
    @Query() query: EventQueryDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<{
    data: EventResponseDto[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const isAdmin = requester.type === 'admin' || isAdminUser(requester);
    const filters = {
      userId: isAdmin
        ? query.userId
        : query.organizationId
          ? undefined
          : requester.id,
      organizerId: isAdmin
        ? query.organizerId
        : query.organizerId === requester.id
          ? query.organizerId
          : undefined,
      organizationId: query.organizationId,
      candidateId: isAdmin ? query.candidateId : undefined,
      type: query.type,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
    if (query.organizationId && !isAdmin) {
      await this.organizationAccess.assertAccess(
        query.organizationId,
        requester,
        'read',
      );
    }

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
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<EventResponseDto> {
    await this.organizationAccess.assertEventAccess(id, requester, 'manage');
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
  async deleteEvent(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.organizationAccess.assertEventAccess(id, requester, 'manage');
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
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<EventResponseDto> {
    if (!requester || requester.id !== userId) {
      throw new ForbiddenException(
        'Solo puedes responder tu propia invitación.',
      );
    }
    await this.organizationAccess.assertEventAccess(id, requester, 'rsvp');
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
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<EventNoteResponseDto> {
    await this.organizationAccess.assertEventAccess(id, requester, 'manage');
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const note = await this.eventService.createNote(id, {
      ...dto,
      authorId: requester.id,
    });
    return EventDomainDtoMapper.noteToDto(note);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Listar notas de un evento' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de notas' })
  async getNotes(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<EventNoteResponseDto[]> {
    await this.organizationAccess.assertEventAccess(id, requester, 'manage');
    const notes = await this.eventService.getNotes(id);
    return notes.map(n => EventDomainDtoMapper.noteToDto(n));
  }
}

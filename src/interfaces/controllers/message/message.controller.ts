import {
  Controller,
  Get,
  Post,
  Put,
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
import { MessageService } from '../../../core/services/message.service';
import { MessageDtoDomainMapper } from '../../../shared/mappers/message/messageDto-domain.mapper';
import { MessageCreateDto } from '../../dtos/message/message-create.dto';
import { MessageResponseDto } from '../../dtos/message/message-response.dto';
import { MessageDomainDtoMapper } from '../../../shared/mappers/message/messageDomain-dto.mapper';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

@ApiTags('message')
@Controller('messages')
export class MessageController {
  constructor(
    private readonly messageService: MessageService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear mensaje' })
  @ApiResponse({ status: 201, description: 'Mensaje creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createMessage(
    @Body() dto: MessageCreateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<MessageResponseDto> {
    const participant = await this.organizationAccess.assertChatParticipant(
      dto.chatId,
      requester,
    );
    const input = MessageDtoDomainMapper.toCreateMessageInput(
      dto,
      participant.participantId,
    );
    const message = await this.messageService.createMessage(input);
    return MessageDomainDtoMapper.toDto(message);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener mensaje por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Mensaje encontrado' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  async getMessageById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<MessageResponseDto> {
    const message = await this.messageService.getMessageById(id);
    if (!message) throw new NotFoundException('Message not found');
    await this.organizationAccess.assertChatParticipant(
      message.chatId,
      requester,
    );
    return MessageDomainDtoMapper.toDto(message);
  }

  @Get('chat/:chatId')
  @ApiOperation({ summary: 'Listar mensajes de un chat' })
  @ApiParam({ name: 'chatId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiResponse({ status: 200, description: 'Lista de mensajes' })
  async getMessagesByChatId(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('search') search?: string,
    @CurrentUser() requester?: AuthenticatedUser,
  ): Promise<MessageResponseDto[]> {
    await this.organizationAccess.assertChatParticipant(chatId, requester);
    const messages = await this.messageService.getMessagesByChatId(
      chatId,
      search,
    );
    return messages.map(msg => MessageDomainDtoMapper.toDto(msg));
  }

  @Put(':id/read')
  @ApiOperation({ summary: 'Marcar mensaje como leído' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Mensaje actualizado' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  async markMessageAsRead(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<MessageResponseDto> {
    const existing = await this.messageService.getMessageById(id);
    if (!existing) throw new NotFoundException('Message not found');
    await this.organizationAccess.assertChatParticipant(
      existing.chatId,
      requester,
    );
    const message = await this.messageService.markMessageAsRead(id);
    if (!message) throw new NotFoundException('Message not found');
    return MessageDomainDtoMapper.toDto(message);
  }

  @Put('chat/:chatId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Marcar todos los mensajes de un chat como leídos' })
  @ApiParam({ name: 'chatId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Mensajes marcados' })
  async markAllMessagesAsRead(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    const participant = await this.organizationAccess.assertChatParticipant(
      chatId,
      requester,
    );
    await this.messageService.markAllMessagesAsRead(
      chatId,
      participant.participantId,
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar mensaje' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Mensaje eliminado' })
  @ApiResponse({ status: 404, description: 'Mensaje no encontrado' })
  async deleteMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    const message = await this.messageService.getMessageById(id);
    if (!message) throw new NotFoundException('Message not found');
    const participant = await this.organizationAccess.assertChatParticipant(
      message.chatId,
      requester,
    );
    if (participant.participantId !== message.senderId)
      throw new ForbiddenException(
        'Solo puedes eliminar tus propios mensajes.',
      );
    await this.messageService.deleteMessage(id);
  }
}

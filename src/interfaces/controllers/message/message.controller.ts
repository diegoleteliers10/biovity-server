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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { MessageService } from '../../../core/services/message.service';
import { MessageDtoDomainMapper } from '../../../shared/mappers/message/messageDto-domain.mapper';
import { MessageCreateDto } from '../../dtos/message/message-create.dto';
import { MessageResponseDto } from '../../dtos/message/message-response.dto';
import { MessageDomainDtoMapper } from '../../../shared/mappers/message/messageDomain-dto.mapper';

@ApiTags('message')
@Controller('messages')
export class MessageController {
  constructor(private readonly messageService: MessageService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createMessage(
    @Body() dto: MessageCreateDto,
  ): Promise<MessageResponseDto> {
    // senderId vendría del token JWT en una implementación real
    const senderId = dto.senderId || '';
    const input = MessageDtoDomainMapper.toCreateMessageInput(dto, senderId);
    const message = await this.messageService.createMessage(input);
    return MessageDomainDtoMapper.toDto(message);
  }

  @Get(':id')
  async getMessageById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageService.getMessageById(id);
    if (!message) throw new NotFoundException('Message not found');
    return MessageDomainDtoMapper.toDto(message);
  }

  @Get('chat/:chatId')
  async getMessagesByChatId(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Query('search') search?: string,
  ): Promise<MessageResponseDto[]> {
    const messages = await this.messageService.getMessagesByChatId(chatId, search);
    return messages.map(msg => MessageDomainDtoMapper.toDto(msg));
  }

  @Put(':id/read')
  async markMessageAsRead(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<MessageResponseDto> {
    const message = await this.messageService.markMessageAsRead(id);
    if (!message) throw new NotFoundException('Message not found');
    return MessageDomainDtoMapper.toDto(message);
  }

  @Put('chat/:chatId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAllMessagesAsRead(
    @Param('chatId', ParseUUIDPipe) chatId: string,
    @Body('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.messageService.markAllMessagesAsRead(chatId, userId);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.messageService.deleteMessage(id);
  }
}

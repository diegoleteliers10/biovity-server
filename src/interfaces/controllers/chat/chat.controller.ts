import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ChatService } from '../../../core/services/chat.service';
import { ChatDtoDomainMapper } from '../../../shared/mappers/chat/chatDto-domain.mapper';
import { ChatCreateDto } from '../../dtos/chat/chat-create.dto';
import { ChatResponseDto } from '../../dtos/chat/chat-response.dto';
import { ChatDomainDtoMapper } from '../../../shared/mappers/chat/chatDomain-dto.mapper';

@ApiTags('chat')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createChat(@Body() dto: ChatCreateDto): Promise<ChatResponseDto> {
    const input = ChatDtoDomainMapper.toCreateChatInput(dto);
    const chat = await this.chatService.createChat(input);
    return ChatDomainDtoMapper.toDto(chat);
  }

  @Get(':id')
  async getChatById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChatResponseDto | null> {
    const chat = await this.chatService.getChatById(id);
    return chat ? ChatDomainDtoMapper.toDto(chat) : null;
  }

  @Get('recruiter/:recruiterId')
  async getChatsByRecruiter(
    @Param('recruiterId', ParseUUIDPipe) recruiterId: string,
  ): Promise<ChatResponseDto[]> {
    const chats = await this.chatService.getChatsByRecruiter(recruiterId);
    return chats.map(chat => ChatDomainDtoMapper.toDto(chat));
  }

  @Get('professional/:professionalId')
  async getChatsByProfessional(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ): Promise<ChatResponseDto[]> {
    const chats = await this.chatService.getChatsByProfessional(professionalId);
    return chats.map(chat => ChatDomainDtoMapper.toDto(chat));
  }

  @Get('participants/:recruiterId/:professionalId')
  async getChatByParticipants(
    @Param('recruiterId', ParseUUIDPipe) recruiterId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ): Promise<ChatResponseDto | null> {
    const chat = await this.chatService.getChatByParticipants(
      recruiterId,
      professionalId,
    );
    return chat ? ChatDomainDtoMapper.toDto(chat) : null;
  }

  @Put(':id')
  async updateChat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<ChatCreateDto>,
  ): Promise<ChatResponseDto | null> {
    const chat = await this.chatService.updateChat(id, dto);
    return chat ? ChatDomainDtoMapper.toDto(chat) : null;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteChat(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.chatService.deleteChat(id);
  }
}

import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ChatService } from '../../../core/services/chat.service';
import { ChatDtoDomainMapper } from '../../../shared/mappers/chat/chatDto-domain.mapper';
import { ChatCreateDto } from '../../dtos/chat/chat-create.dto';
import { ChatUpdateDto } from '../../dtos/chat/chat-update.dto';
import { ChatResponseDto } from '../../dtos/chat/chat-response.dto';
import { ChatDomainDtoMapper } from '../../../shared/mappers/chat/chatDomain-dto.mapper';
import {
  PaginatedResponse,
  parsePagination,
} from '../../../shared/pagination/pagination';

type ChatRole = 'recruiter' | 'professional';

@ApiTags('chat')
@Controller('chats')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  private assertChatRole(role: string): ChatRole {
    if (role !== 'recruiter' && role !== 'professional') {
      throw new BadRequestException(
        "role must be 'recruiter' or 'professional'",
      );
    }
    return role;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear chat' })
  @ApiResponse({ status: 201, description: 'Chat creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createChat(@Body() dto: ChatCreateDto): Promise<ChatResponseDto> {
    const input = ChatDtoDomainMapper.toCreateChatInput(dto);
    const chat = await this.chatService.createChat(input);
    return ChatDomainDtoMapper.toDto(chat);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener chat por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Chat encontrado' })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async getChatById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatService.getChatById(id);
    if (!chat) throw new NotFoundException('Chat not found');
    return ChatDomainDtoMapper.toDto(chat);
  }

  @Get('recruiter/:recruiterId')
  @ApiOperation({ summary: 'Listar chats de un reclutador con paginación' })
  @ApiParam({ name: 'recruiterId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de chats' })
  async getChatsByRecruiter(
    @Param('recruiterId', ParseUUIDPipe) recruiterId: string,
    @Query() query: Record<string, string>,
  ): Promise<PaginatedResponse<ChatResponseDto>> {
    const result = await this.chatService.getChatsByRecruiter(
      recruiterId,
      parsePagination(query),
    );
    return {
      ...result,
      data: result.data.map(chat =>
        ChatDomainDtoMapper.toDto(chat, 'recruiter'),
      ),
    };
  }

  @Get('professional/:professionalId')
  @ApiOperation({ summary: 'Listar chats de un profesional con paginación' })
  @ApiParam({ name: 'professionalId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de chats' })
  async getChatsByProfessional(
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
    @Query() query: Record<string, string>,
  ): Promise<PaginatedResponse<ChatResponseDto>> {
    const result = await this.chatService.getChatsByProfessional(
      professionalId,
      parsePagination(query),
    );
    return {
      ...result,
      data: result.data.map(chat =>
        ChatDomainDtoMapper.toDto(chat, 'professional'),
      ),
    };
  }

  @Get('participants/:recruiterId/:professionalId')
  @ApiOperation({ summary: 'Obtener chat por participantes' })
  @ApiParam({ name: 'recruiterId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'professionalId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Chat encontrado' })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async getChatByParticipants(
    @Param('recruiterId', ParseUUIDPipe) recruiterId: string,
    @Param('professionalId', ParseUUIDPipe) professionalId: string,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatService.getChatByParticipants(
      recruiterId,
      professionalId,
    );
    if (!chat) throw new NotFoundException('Chat not found');
    return ChatDomainDtoMapper.toDto(chat);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar chat' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Chat actualizado' })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async updateChat(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ChatUpdateDto,
  ): Promise<ChatResponseDto> {
    const chat = await this.chatService.updateChat(id, dto);
    if (!chat) throw new NotFoundException('Chat not found');
    return ChatDomainDtoMapper.toDto(chat);
  }

  @Patch(':id/pin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fijar o soltar un chat' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'role',
    type: String,
    description: 'recruiter o professional',
  })
  @ApiResponse({ status: 200, description: 'Chat actualizado' })
  @ApiResponse({ status: 400, description: 'Rol inválido' })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async togglePin(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('role') role: string,
  ): Promise<ChatResponseDto> {
    const assertedRole = this.assertChatRole(role);
    const chat = await this.chatService.togglePin(id, assertedRole);
    if (!chat) throw new NotFoundException('Chat not found');
    return ChatDomainDtoMapper.toDto(chat, assertedRole);
  }

  @Patch(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Archivar o desarchivar un chat' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiQuery({
    name: 'role',
    type: String,
    description: 'recruiter o professional',
  })
  @ApiResponse({ status: 200, description: 'Chat actualizado' })
  @ApiResponse({ status: 400, description: 'Rol inválido' })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async toggleArchive(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('role') role: string,
  ): Promise<ChatResponseDto> {
    const assertedRole = this.assertChatRole(role);
    const chat = await this.chatService.toggleArchive(id, assertedRole);
    if (!chat) throw new NotFoundException('Chat not found');
    return ChatDomainDtoMapper.toDto(chat, assertedRole);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar chat' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Chat eliminado' })
  @ApiResponse({ status: 404, description: 'Chat no encontrado' })
  async deleteChat(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.chatService.deleteChat(id);
  }
}

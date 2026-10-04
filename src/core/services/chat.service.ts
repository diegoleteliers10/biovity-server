import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IChatRepository } from '../repositories/chat.repository';
import {
  IChatUseCase,
  CreateChatInput,
  UpdateChatInput,
} from '../use-cases/chat/chat.use-case';
import { Chat } from '../domain/entities/chat.entity';
import {
  parsePagination,
  paginated,
  type PaginatedResponse,
  type PaginationQuery,
} from '../../shared/pagination/pagination';

@Injectable()
export class ChatService implements IChatUseCase {
  constructor(
    @Inject('IChatRepository')
    private readonly chatRepository: IChatRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createChat(data: CreateChatInput): Promise<Chat> {
    // Check if chat already exists between these participants
    const existingChat =
      await this.chatRepository.findByRecruiterAndProfessional(
        data.recruiterId,
        data.professionalId,
      );

    if (existingChat) {
      return existingChat;
    }

    const chat = new Chat(
      this.generateId(),
      data.recruiterId,
      data.professionalId,
      data.lastMessage,
      0,
      0,
      new Date(),
    );

    return this.chatRepository.create(chat);
  }

  async getChatById(id: string): Promise<Chat | null> {
    return this.chatRepository.findById(id);
  }

  async getChatsByRecruiter(
    recruiterId: string,
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<Chat>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [chats, total] = await Promise.all([
      this.chatRepository.findByRecruiterId(recruiterId, { take: limit, skip }),
      this.chatRepository.countByRecruiterId(recruiterId),
    ]);
    return paginated(chats, total, page, limit);
  }

  async getChatsByProfessional(
    professionalId: string,
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<Chat>> {
    const { page, limit, skip } = parsePagination(pagination ?? {});
    const [chats, total] = await Promise.all([
      this.chatRepository.findByProfessionalId(professionalId, {
        take: limit,
        skip,
      }),
      this.chatRepository.countByProfessionalId(professionalId),
    ]);
    return paginated(chats, total, page, limit);
  }

  async getChatByParticipants(
    recruiterId: string,
    professionalId: string,
  ): Promise<Chat | null> {
    return this.chatRepository.findByRecruiterAndProfessional(
      recruiterId,
      professionalId,
    );
  }

  async updateChat(id: string, data: UpdateChatInput): Promise<Chat | null> {
    const existingChat = await this.chatRepository.findById(id);
    if (!existingChat) {
      throw new NotFoundException(`Chat with id ${id} not found`);
    }

    const updatedChat: Partial<Chat> = {
      ...existingChat,
      lastMessage: data.lastMessage ?? existingChat.lastMessage,
      unreadCountRecruiter:
        data.unreadCountRecruiter ?? existingChat.unreadCountRecruiter,
      unreadCountProfessional:
        data.unreadCountProfessional ?? existingChat.unreadCountProfessional,
      updatedAt: new Date(),
    };

    return this.chatRepository.update(id, updatedChat);
  }

  async archiveForParticipant(
    id: string,
    role: 'recruiter' | 'professional',
  ): Promise<Chat | null> {
    const existingChat = await this.chatRepository.findById(id);
    if (!existingChat) {
      throw new NotFoundException(`Chat with id ${id} not found`);
    }
    const partial: Partial<Chat> =
      role === 'recruiter'
        ? { isArchivedByRecruiter: true }
        : { isArchivedByProfessional: true };
    return this.chatRepository.update(id, partial);
  }

  async togglePin(
    id: string,
    role: 'recruiter' | 'professional',
  ): Promise<Chat | null> {
    const existingChat = await this.chatRepository.findById(id);
    if (!existingChat) {
      throw new NotFoundException(`Chat with id ${id} not found`);
    }
    const next =
      role === 'recruiter'
        ? !existingChat.isPinnedByRecruiter
        : !existingChat.isPinnedByProfessional;
    const partial: Partial<Chat> =
      role === 'recruiter'
        ? { isPinnedByRecruiter: next }
        : { isPinnedByProfessional: next };
    return this.chatRepository.update(id, partial);
  }

  async toggleArchive(
    id: string,
    role: 'recruiter' | 'professional',
  ): Promise<Chat | null> {
    const existingChat = await this.chatRepository.findById(id);
    if (!existingChat) {
      throw new NotFoundException(`Chat with id ${id} not found`);
    }
    const next =
      role === 'recruiter'
        ? !existingChat.isArchivedByRecruiter
        : !existingChat.isArchivedByProfessional;
    const partial: Partial<Chat> =
      role === 'recruiter'
        ? { isArchivedByRecruiter: next }
        : { isArchivedByProfessional: next };
    return this.chatRepository.update(id, partial);
  }
}

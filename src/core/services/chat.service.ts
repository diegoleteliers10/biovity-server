import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IChatRepository } from '../repositories/chat.repository';
import {
  IChatUseCase,
  CreateChatInput,
  UpdateChatInput,
} from '../use-cases/chat/chat.use-case';
import { Chat } from '../domain/entities/chat.entity';

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

  async getChatsByRecruiter(recruiterId: string): Promise<Chat[]> {
    return this.chatRepository.findByRecruiterId(recruiterId);
  }

  async getChatsByProfessional(professionalId: string): Promise<Chat[]> {
    return this.chatRepository.findByProfessionalId(professionalId);
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

  async deleteChat(id: string): Promise<boolean> {
    const existingChat = await this.chatRepository.findById(id);
    if (!existingChat) {
      throw new NotFoundException(`Chat with id ${id} not found`);
    }

    return this.chatRepository.delete(id);
  }
}

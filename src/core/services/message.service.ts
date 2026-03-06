import { Injectable, NotFoundException, Inject } from '@nestjs/common';
import * as crypto from 'crypto';
import { IMessageRepository } from '../repositories/message.repository';
import { IChatRepository } from '../repositories/chat.repository';
import {
  IMessageUseCase,
  CreateMessageInput,
} from '../use-cases/message/message.use-case';
import { Message } from '../domain/entities/message.entity';

@Injectable()
export class MessageService implements IMessageUseCase {
  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepository: IMessageRepository,
    @Inject('IChatRepository')
    private readonly chatRepository: IChatRepository,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createMessage(data: CreateMessageInput): Promise<Message> {
    // Verify chat exists
    const chat = await this.chatRepository.findById(data.chatId);
    if (!chat) {
      throw new NotFoundException(`Chat with id ${data.chatId} not found`);
    }

    const message = new Message(
      this.generateId(),
      data.chatId,
      data.senderId,
      data.content,
      false,
      new Date(),
    );

    const savedMessage = await this.messageRepository.create(message);

    // Update chat's lastMessage
    await this.chatRepository.update(data.chatId, {
      lastMessage: data.content,
      updatedAt: new Date(),
    });

    return savedMessage;
  }

  async getMessageById(id: string): Promise<Message | null> {
    return this.messageRepository.findById(id);
  }

  async getMessagesByChatId(chatId: string): Promise<Message[]> {
    return this.messageRepository.findByChatId(chatId);
  }

  async markMessageAsRead(id: string): Promise<Message | null> {
    return this.messageRepository.markAsRead(id);
  }

  async markAllMessagesAsRead(chatId: string, userId: string): Promise<void> {
    await this.messageRepository.markAllAsReadByChatId(chatId, userId);
  }

  async deleteMessage(id: string): Promise<boolean> {
    return this.messageRepository.delete(id);
  }
}

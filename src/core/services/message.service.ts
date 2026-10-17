import {
  Inject,
  Injectable,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { DataSource } from 'typeorm';
import { InjectDataSource } from '@nestjs/typeorm';
import { IMessageRepository } from '../repositories/message.repository';
import {
  IMessageUseCase,
  CreateMessageInput,
} from '../use-cases/message/message.use-case';
import { Message, MessageContent } from '../domain/entities/message.entity';
import { MessageType } from '../domain/enums';
import { MessageEntity } from '../../infrastructure/database/orm/message.entity';
import { ChatEntity } from '../../infrastructure/database/orm/chat.entity';

@Injectable()
export class MessageService implements IMessageUseCase {
  constructor(
    @Inject('IMessageRepository')
    private readonly messageRepository: IMessageRepository,
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  private generateId(): string {
    return crypto.randomUUID();
  }

  async createMessage(data: CreateMessageInput): Promise<Message> {
    const message = new Message(
      this.generateId(),
      data.chatId,
      data.senderId,
      data.content,
      data.type || MessageType.TEXT,
      (data.contentType as unknown as MessageContent) || null,
      false,
      new Date(),
    );

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();
    let savedEntity: MessageEntity;
    try {
      const messageEntity = new MessageEntity();
      const chats = await queryRunner.manager.query<
        Array<{ recruiterId: string; professionalId: string }>
      >(
        `SELECT "recruiterId", "professionalId" FROM chat
         WHERE id = $1::uuid FOR UPDATE`,
        [data.chatId],
      );
      const chat = chats[0];
      if (!chat) {
        throw new NotFoundException(`Chat with id ${data.chatId} not found`);
      }
      const recipientId =
        data.senderId === chat.recruiterId
          ? chat.professionalId
          : data.senderId === chat.professionalId
            ? chat.recruiterId
            : null;
      if (!recipientId)
        throw new ForbiddenException('Sender is not a chat participant');

      Object.assign(messageEntity, {
        id: message.id,
        chatId: message.chatId,
        senderId: message.senderId,
        content: message.content,
        type: message.type,
        contentType: message.contentType,
        isRead: message.isRead,
        createdAt: message.createdAt,
      });
      savedEntity = await queryRunner.manager.save(
        MessageEntity,
        messageEntity,
      );

      await queryRunner.manager.update(ChatEntity, data.chatId, {
        lastMessage: data.content,
        updatedAt: new Date(),
      });

      await queryRunner.manager.query(
        `INSERT INTO message_notification_intent (message_id, chat_id, recipient_id)
         VALUES ($1::uuid, $2::uuid, $3::uuid)
         ON CONFLICT (message_id, recipient_id) DO NOTHING`,
        [message.id, data.chatId, recipientId],
      );

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return new Message(
      savedEntity.id,
      savedEntity.chatId,
      savedEntity.senderId,
      savedEntity.content,
      savedEntity.type,
      savedEntity.contentType,
      savedEntity.isRead,
      savedEntity.createdAt,
    );
  }

  async getMessageById(id: string): Promise<Message | null> {
    return this.messageRepository.findById(id);
  }

  async getMessagesByChatId(
    chatId: string,
    search?: string,
  ): Promise<Message[]> {
    return this.messageRepository.findByChatId(chatId, { search });
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

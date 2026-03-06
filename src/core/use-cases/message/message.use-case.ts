import { Message } from '../../domain/entities/message.entity';

export interface IMessageUseCase {
  createMessage(data: CreateMessageInput): Promise<Message>;
  getMessageById(id: string): Promise<Message | null>;
  getMessagesByChatId(chatId: string): Promise<Message[]>;
  markMessageAsRead(id: string): Promise<Message | null>;
  markAllMessagesAsRead(chatId: string, userId: string): Promise<void>;
  deleteMessage(id: string): Promise<boolean>;
}

export interface CreateMessageInput {
  chatId: string;
  senderId: string;
  content: string;
}

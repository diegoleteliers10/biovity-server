import { Message } from '../domain/entities/index';

export interface MessagePagination {
  take?: number;
  skip?: number;
  search?: string;
}

export interface IMessageRepository {
  create(entity: Message): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  findByChatId(
    chatId: string,
    pagination?: MessagePagination,
  ): Promise<Message[]>;
  markAsRead(id: string): Promise<Message | null>;
  markAllAsReadByChatId(chatId: string, userId: string): Promise<void>;
  delete(id: string): Promise<boolean>;
}

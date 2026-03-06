import { Message } from '../domain/entities/index';

export interface IMessageRepository {
  create(entity: Message): Promise<Message>;
  findById(id: string): Promise<Message | null>;
  findByChatId(chatId: string): Promise<Message[]>;
  markAsRead(id: string): Promise<Message | null>;
  markAllAsReadByChatId(chatId: string, userId: string): Promise<void>;
  delete(id: string): Promise<boolean>;
}

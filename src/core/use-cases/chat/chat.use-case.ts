import { Chat } from '../../domain/entities/chat.entity';

export interface IChatUseCase {
  createChat(data: CreateChatInput): Promise<Chat>;
  getChatById(id: string): Promise<Chat | null>;
  getChatsByRecruiter(recruiterId: string): Promise<Chat[]>;
  getChatsByProfessional(professionalId: string): Promise<Chat[]>;
  getChatByParticipants(
    recruiterId: string,
    professionalId: string,
  ): Promise<Chat | null>;
  updateChat(id: string, data: UpdateChatInput): Promise<Chat | null>;
  deleteChat(id: string): Promise<boolean>;
}

export interface CreateChatInput {
  recruiterId: string;
  professionalId: string;
  lastMessage?: string;
}

export interface UpdateChatInput {
  lastMessage?: string;
  unreadCountRecruiter?: number;
  unreadCountProfessional?: number;
}

import { Chat } from '../../domain/entities/chat.entity';
import type {
  PaginatedResponse,
  PaginationQuery,
} from '../../../shared/pagination/pagination';

export interface IChatUseCase {
  createChat(data: CreateChatInput): Promise<Chat>;
  getChatById(id: string): Promise<Chat | null>;
  getChatsByRecruiter(
    recruiterId: string,
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<Chat>>;
  getChatsByProfessional(
    professionalId: string,
    pagination?: PaginationQuery,
  ): Promise<PaginatedResponse<Chat>>;
  getChatByParticipants(
    recruiterId: string,
    professionalId: string,
  ): Promise<Chat | null>;
  updateChat(id: string, data: UpdateChatInput): Promise<Chat | null>;
  archiveForParticipant(
    id: string,
    role: 'recruiter' | 'professional',
  ): Promise<Chat | null>;
  togglePin(
    id: string,
    role: 'recruiter' | 'professional',
  ): Promise<Chat | null>;
  toggleArchive(
    id: string,
    role: 'recruiter' | 'professional',
  ): Promise<Chat | null>;
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

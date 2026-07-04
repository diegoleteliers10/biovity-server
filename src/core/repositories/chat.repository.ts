import { Chat } from '../domain/entities/index';

export interface ChatPagination {
  take?: number;
  skip?: number;
}

export interface IChatRepository {
  create(entity: Chat): Promise<Chat>;
  findById(id: string): Promise<Chat | null>;
  findByRecruiterAndProfessional(
    recruiterId: string,
    professionalId: string,
  ): Promise<Chat | null>;
  findByRecruiterId(
    recruiterId: string,
    pagination?: ChatPagination,
  ): Promise<Chat[]>;
  findByProfessionalId(
    professionalId: string,
    pagination?: ChatPagination,
  ): Promise<Chat[]>;
  update(id: string, entity: Partial<Chat>): Promise<Chat | null>;
  delete(id: string): Promise<boolean>;
}

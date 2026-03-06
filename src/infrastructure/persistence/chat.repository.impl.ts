import { IChatRepository } from '../../core/repositories/chat.repository';
import { Injectable } from '@nestjs/common';
import { ChatEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../../core/domain/entities/chat.entity';
import { ChatDomainOrmMapper } from '../../shared/mappers/chat/chatDomain-orm.mapper';

@Injectable()
export class ChatRepositoryImpl implements IChatRepository {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
  ) {}

  async create(entity: Chat): Promise<Chat> {
    const chatOrm = ChatDomainOrmMapper.toOrm(entity);
    const savedChat = await this.chatRepository.save(chatOrm);
    return ChatDomainOrmMapper.toDomain(savedChat);
  }

  async findById(id: string): Promise<Chat | null> {
    const chatOrm = await this.chatRepository.findOne({
      where: { id },
      relations: ['recruiter', 'professional'],
    });
    return chatOrm ? ChatDomainOrmMapper.toDomain(chatOrm) : null;
  }

  async findByRecruiterAndProfessional(
    recruiterId: string,
    professionalId: string,
  ): Promise<Chat | null> {
    const chatOrm = await this.chatRepository.findOne({
      where: { recruiterId, professionalId },
      relations: ['recruiter', 'professional'],
    });
    return chatOrm ? ChatDomainOrmMapper.toDomain(chatOrm) : null;
  }

  async findByRecruiterId(recruiterId: string): Promise<Chat[]> {
    const chatsOrm = await this.chatRepository.find({
      where: { recruiterId },
      relations: ['recruiter', 'professional'],
      order: { updatedAt: 'DESC' },
    });
    return chatsOrm.map(chatOrm => ChatDomainOrmMapper.toDomain(chatOrm));
  }

  async findByProfessionalId(professionalId: string): Promise<Chat[]> {
    const chatsOrm = await this.chatRepository.find({
      where: { professionalId },
      relations: ['recruiter', 'professional'],
      order: { updatedAt: 'DESC' },
    });
    return chatsOrm.map(chatOrm => ChatDomainOrmMapper.toDomain(chatOrm));
  }

  async update(id: string, entity: Partial<Chat>): Promise<Chat | null> {
    const existingChat = await this.chatRepository.findOne({ where: { id } });
    if (!existingChat) return null;

    const updatedChatOrm = {
      ...existingChat,
      ...ChatDomainOrmMapper.toOrm(entity as Chat),
    };
    const savedChat = await this.chatRepository.save(updatedChatOrm);
    return ChatDomainOrmMapper.toDomain(savedChat);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.chatRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

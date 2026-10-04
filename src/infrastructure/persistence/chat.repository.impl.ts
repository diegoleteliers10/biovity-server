import { IChatRepository } from '../../core/repositories/chat.repository';
import { Injectable } from '@nestjs/common';
import { ChatEntity, MessageEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../../core/domain/entities/chat.entity';
import { ChatDomainOrmMapper } from '../../shared/mappers/chat/chatDomain-orm.mapper';

@Injectable()
export class ChatRepositoryImpl implements IChatRepository {
  constructor(
    @InjectRepository(ChatEntity)
    private readonly chatRepository: Repository<ChatEntity>,
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async create(entity: Chat): Promise<Chat> {
    const chatOrm = ChatDomainOrmMapper.toOrm(entity);
    const savedChat = await this.chatRepository.save(chatOrm);
    return ChatDomainOrmMapper.toDomain(savedChat);
  }

  async findById(id: string): Promise<Chat | null> {
    const chatOrm = await this.chatRepository.findOne({
      where: { id },
      relations: { recruiter: true, professional: true },
    });
    if (!chatOrm) return null;
    const chats = await this.withUnreadCounts([chatOrm]);
    return chats[0] ?? null;
  }

  async findByRecruiterAndProfessional(
    recruiterId: string,
    professionalId: string,
  ): Promise<Chat | null> {
    const chatOrm = await this.chatRepository.findOne({
      where: { recruiterId, professionalId },
      relations: { recruiter: true, professional: true },
    });
    return chatOrm ? ChatDomainOrmMapper.toDomain(chatOrm) : null;
  }

  async findByRecruiterId(
    recruiterId: string,
    pagination?: { take?: number; skip?: number },
  ): Promise<Chat[]> {
    const chatsOrm = await this.chatRepository.find({
      where: { recruiterId },
      relations: { recruiter: true, professional: true },
      order: { updatedAt: 'DESC' },
      take: pagination?.take ?? 50,
      skip: pagination?.skip ?? 0,
    });
    return this.withUnreadCounts(chatsOrm);
  }

  async findByProfessionalId(
    professionalId: string,
    pagination?: { take?: number; skip?: number },
  ): Promise<Chat[]> {
    const chatsOrm = await this.chatRepository.find({
      where: { professionalId },
      relations: { recruiter: true, professional: true },
      order: { updatedAt: 'DESC' },
      take: pagination?.take ?? 50,
      skip: pagination?.skip ?? 0,
    });
    return this.withUnreadCounts(chatsOrm);
  }

  async countByRecruiterId(recruiterId: string): Promise<number> {
    return this.chatRepository.count({ where: { recruiterId } });
  }

  private async withUnreadCounts(chats: ChatEntity[]): Promise<Chat[]> {
    if (chats.length === 0) return [];
    const unread = await this.messageRepository
      .createQueryBuilder('message')
      .select('message.chatId', 'chatId')
      .addSelect('message.senderId', 'senderId')
      .addSelect('COUNT(*)::integer', 'count')
      .where('message.chatId IN (:...chatIds)', {
        chatIds: chats.map(chat => chat.id),
      })
      .andWhere('message.isRead = false')
      .groupBy('message.chatId')
      .addGroupBy('message.senderId')
      .getRawMany<{ chatId: string; senderId: string; count: number }>();
    return chats.map(chat =>
      ChatDomainOrmMapper.toDomain({
        ...chat,
        unreadCountRecruiter: unread
          .filter(
            row =>
              row.chatId === chat.id && row.senderId === chat.professionalId,
          )
          .reduce((count, row) => count + row.count, 0),
        unreadCountProfessional: unread
          .filter(
            row => row.chatId === chat.id && row.senderId === chat.recruiterId,
          )
          .reduce((count, row) => count + row.count, 0),
      }),
    );
  }

  async countByProfessionalId(professionalId: string): Promise<number> {
    return this.chatRepository.count({ where: { professionalId } });
  }

  async update(id: string, entity: Partial<Chat>): Promise<Chat | null> {
    const existingChat = await this.chatRepository.findOne({ where: { id } });
    if (!existingChat) return null;

    const updatedChatOrm = {
      ...existingChat,
      ...ChatDomainOrmMapper.toPartialOrm(entity),
    };
    const savedChat = await this.chatRepository.save(updatedChatOrm);
    return ChatDomainOrmMapper.toDomain(savedChat);
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.chatRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

import { IMessageRepository } from '../../core/repositories/message.repository';
import { Injectable } from '@nestjs/common';
import { MessageEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from '../../core/domain/entities/message.entity';
import { MessageDomainOrmMapper } from '../../shared/mappers/message/messageDomain-orm.mapper';

@Injectable()
export class MessageRepositoryImpl implements IMessageRepository {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly messageRepository: Repository<MessageEntity>,
  ) {}

  async create(entity: Message): Promise<Message> {
    const messageOrm = MessageDomainOrmMapper.toOrm(entity);
    const savedMessage = await this.messageRepository.save(messageOrm);
    return MessageDomainOrmMapper.toDomain(savedMessage);
  }

  async findById(id: string): Promise<Message | null> {
    const messageOrm = await this.messageRepository.findOne({
      where: { id },
      relations: ['sender'],
    });
    return messageOrm ? MessageDomainOrmMapper.toDomain(messageOrm) : null;
  }

  async findByChatId(
    chatId: string,
    pagination?: { take?: number; skip?: number; search?: string },
  ): Promise<Message[]> {
    const queryBuilder = this.messageRepository
      .createQueryBuilder('message')
      .leftJoinAndSelect('message.sender', 'sender')
      .where('message.chatId = :chatId', { chatId });

    if (pagination?.search) {
      queryBuilder.andWhere('message.content ILIKE :search', {
        search: `%${pagination.search}%`,
      });
    }

    queryBuilder
      .orderBy('message.createdAt', 'ASC')
      .take(pagination?.take ?? 50)
      .skip(pagination?.skip ?? 0);

    const messagesOrm = await queryBuilder.getMany();
    return messagesOrm.map(msgOrm => MessageDomainOrmMapper.toDomain(msgOrm));
  }

  async markAsRead(id: string): Promise<Message | null> {
    await this.messageRepository.update(id, { isRead: true });
    return this.findById(id);
  }

  async markAllAsReadByChatId(chatId: string, userId: string): Promise<void> {
    await this.messageRepository.update(
      { chatId, senderId: userId, isRead: false },
      { isRead: true },
    );
  }

  async delete(id: string): Promise<boolean> {
    const result = await this.messageRepository.delete(id);
    return result.affected != null && result.affected > 0;
  }
}

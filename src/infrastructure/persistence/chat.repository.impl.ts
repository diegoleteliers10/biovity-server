import { IChatRepository } from '../../core/repositories/chat.repository';
import { Injectable } from '@nestjs/common';
import { ChatEntity, MessageEntity } from '../database/orm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Chat } from '../../core/domain/entities/chat.entity';
import { ChatDomainOrmMapper } from '../../shared/mappers/chat/chatDomain-orm.mapper';
import type {
  UnassignedChatReviewDetail,
  UnassignedChatReviewSummary,
  VerifiedChatReviewOrganization,
  VerifiedChatOrganizationAssignmentInput,
  VerifiedChatOrganizationAssignmentResult,
} from '../../core/repositories/chat.repository';

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
    organizationId?: string,
  ): Promise<Chat | null> {
    const chatOrm = await this.chatRepository.findOne({
      where: {
        recruiterId,
        professionalId,
        ...(organizationId === undefined ? {} : { organizationId }),
      },
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

  async findUnassignedForReview(
    pagination?: { take?: number; skip?: number },
  ): Promise<{ data: UnassignedChatReviewSummary[]; total: number }> {
    const query = this.chatRepository
      .createQueryBuilder('chat')
      .leftJoin('chat.recruiter', 'recruiter')
      .leftJoin('chat.professional', 'professional')
      .select([
        'chat.id',
        'chat.createdAt',
        'chat.updatedAt',
        'recruiter.id',
        'recruiter.name',
        'recruiter.email',
        'professional.id',
        'professional.name',
        'professional.email',
      ])
      .where('chat.organizationId IS NULL')
      .orderBy('chat.updatedAt', 'DESC')
      .skip(pagination?.skip ?? 0)
      .take(pagination?.take ?? 20);
    const [chats, total] = await query.getManyAndCount();

    return { data: chats.map(chat => this.toReviewSummary(chat)), total };
  }

  async findUnassignedForReviewById(
    id: string,
  ): Promise<UnassignedChatReviewDetail | null> {
    const chat = await this.chatRepository
      .createQueryBuilder('chat')
      .leftJoin('chat.recruiter', 'recruiter')
      .leftJoin('chat.professional', 'professional')
      .select([
        'chat.id',
        'chat.createdAt',
        'chat.updatedAt',
        'recruiter.id',
        'recruiter.name',
        'recruiter.email',
        'professional.id',
        'professional.name',
        'professional.email',
      ])
      .where('chat.id = :id', { id })
      .andWhere('chat.organizationId IS NULL')
      .getOne();

    if (!chat) return null;

    const messages = await this.messageRepository
      .createQueryBuilder('message')
      .leftJoin('message.sender', 'sender')
      .select([
        'message.id',
        'message.senderId',
        'message.content',
        'message.createdAt',
        'sender.id',
        'sender.name',
      ])
      .where('message.chatId = :chatId', { chatId: id })
      .orderBy('message.createdAt', 'ASC')
      .getMany();

    return {
      ...this.toReviewSummary(chat),
      messages: messages.map(message => ({
        id: message.id,
        senderId: message.senderId,
        senderName: message.sender?.name ?? 'Unknown participant',
        content: message.content,
        createdAt: message.createdAt,
      })),
    };
  }

  async findVerifiedOrganizationsForReview(input: {
    take: number;
    skip: number;
    search?: string;
  }): Promise<{ data: VerifiedChatReviewOrganization[]; total: number }> {
    const search = input.search?.trim();
    const values: unknown[] = [];
    const searchCondition = search
      ? `AND name ILIKE $1`
      : '';
    if (search) values.push(`%${search}%`);
    const limitPosition = values.length + 1;
    const offsetPosition = values.length + 2;
    values.push(input.take, input.skip);

    const [countRows, data] = await Promise.all([
      this.chatRepository.manager.query<Array<{ total: string }>>(
        `SELECT COUNT(*)::text AS total FROM organization
         WHERE verification_status = 'verified' ${searchCondition}`,
        search ? values.slice(0, 1) : [],
      ),
      this.chatRepository.manager.query<VerifiedChatReviewOrganization[]>(
        `SELECT id, name FROM organization
         WHERE verification_status = 'verified' ${searchCondition}
         ORDER BY name ASC
         LIMIT $${limitPosition} OFFSET $${offsetPosition}`,
        values,
      ),
    ]);

    return { data, total: Number(countRows[0]?.total ?? 0) };
  }

  async assignVerifiedOrganizationToUnassignedChat(
    input: VerifiedChatOrganizationAssignmentInput,
  ): Promise<VerifiedChatOrganizationAssignmentResult> {
    return this.chatRepository.manager.transaction(async manager => {
      const organizations = await manager.query<
        Array<{ id: string; verificationStatus: string }>
      >(
        `SELECT id, verification_status AS "verificationStatus"
         FROM organization WHERE id = $1::uuid FOR SHARE`,
        [input.organizationId],
      );
      const organization = organizations[0];

      if (!organization) return { kind: 'organization_not_found' };
      if (organization.verificationStatus !== 'verified') {
        return { kind: 'organization_not_verified' };
      }

      const assigned = await manager.query<Array<{ id: string }>>(
        `UPDATE chat
         SET "organizationId" = $2::uuid,
             organization_assignment_actor_id = $3::uuid,
             organization_assigned_at = $4
         WHERE id = $1::uuid AND "organizationId" IS NULL
         RETURNING id`,
        [input.chatId, input.organizationId, input.actorId, input.assignedAt],
      );

      if (assigned[0]) return { kind: 'assigned' };

      const existing = await manager.query<
        Array<{ id: string; organizationId: string | null }>
      >(`SELECT id, "organizationId" FROM chat WHERE id = $1::uuid`, [input.chatId]);

      if (!existing[0]) return { kind: 'chat_not_found' };
      return { kind: 'already_assigned' };
    });
  }

  private toReviewSummary(chat: ChatEntity): UnassignedChatReviewSummary {
    return {
      id: chat.id,
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt ?? null,
      recruiter: {
        id: chat.recruiter.id,
        name: chat.recruiter.name,
        email: chat.recruiter.email,
      },
      professional: {
        id: chat.professional.id,
        name: chat.professional.name,
        email: chat.professional.email,
      },
    };
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

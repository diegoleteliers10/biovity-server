import { Chat } from '../../../core/domain/entities/chat.entity';
import { ChatEntity } from '../../../infrastructure/database/orm/chat.entity';

export class ChatDomainOrmMapper {
  static toOrm(domain: Chat): ChatEntity {
    const chatOrm = new ChatEntity();
    chatOrm.id = domain.id;
    chatOrm.recruiterId = domain.recruiterId;
    chatOrm.professionalId = domain.professionalId;
    chatOrm.lastMessage = domain.lastMessage;
    chatOrm.unreadCountRecruiter = domain.unreadCountRecruiter;
    chatOrm.unreadCountProfessional = domain.unreadCountProfessional;
    chatOrm.isPinnedByRecruiter = domain.isPinnedByRecruiter;
    chatOrm.isPinnedByProfessional = domain.isPinnedByProfessional;
    chatOrm.isArchivedByRecruiter = domain.isArchivedByRecruiter;
    chatOrm.isArchivedByProfessional = domain.isArchivedByProfessional;
    chatOrm.createdAt = domain.createdAt;
    chatOrm.updatedAt = domain.updatedAt;

    return chatOrm;
  }

  static toPartialOrm(domain: Partial<Chat>): Partial<ChatEntity> {
    const partial: Partial<ChatEntity> = {};
    if (domain.recruiterId !== undefined) partial.recruiterId = domain.recruiterId;
    if (domain.professionalId !== undefined) partial.professionalId = domain.professionalId;
    if (domain.lastMessage !== undefined) partial.lastMessage = domain.lastMessage;
    if (domain.unreadCountRecruiter !== undefined)
      partial.unreadCountRecruiter = domain.unreadCountRecruiter;
    if (domain.unreadCountProfessional !== undefined)
      partial.unreadCountProfessional = domain.unreadCountProfessional;
    if (domain.isPinnedByRecruiter !== undefined)
      partial.isPinnedByRecruiter = domain.isPinnedByRecruiter;
    if (domain.isPinnedByProfessional !== undefined)
      partial.isPinnedByProfessional = domain.isPinnedByProfessional;
    if (domain.isArchivedByRecruiter !== undefined)
      partial.isArchivedByRecruiter = domain.isArchivedByRecruiter;
    if (domain.isArchivedByProfessional !== undefined)
      partial.isArchivedByProfessional = domain.isArchivedByProfessional;
    if (domain.createdAt !== undefined) partial.createdAt = domain.createdAt;
    if (domain.updatedAt !== undefined) partial.updatedAt = domain.updatedAt;
    return partial;
  }

  static toDomain(entity: ChatEntity): Chat {
    return new Chat(
      entity.id,
      entity.recruiterId,
      entity.professionalId,
      entity.lastMessage,
      entity.unreadCountRecruiter,
      entity.unreadCountProfessional,
      entity.createdAt,
      entity.updatedAt,
      entity.isPinnedByRecruiter,
      entity.isPinnedByProfessional,
      entity.isArchivedByRecruiter,
      entity.isArchivedByProfessional,
    );
  }
}

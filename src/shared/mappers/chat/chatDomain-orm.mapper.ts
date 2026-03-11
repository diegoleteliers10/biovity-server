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
    chatOrm.createdAt = domain.createdAt;
    chatOrm.updatedAt = domain.updatedAt;

    return chatOrm;
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
    );
  }
}

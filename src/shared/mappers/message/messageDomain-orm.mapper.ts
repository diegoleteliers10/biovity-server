import { Message } from '../../../core/domain/entities/message.entity';
import { MessageEntity } from '../../../infrastructure/database/orm/message.entity';

export class MessageDomainOrmMapper {
  static toOrm(domain: Message): MessageEntity {
    const messageOrm = new MessageEntity();
    messageOrm.id = domain.id;
    messageOrm.chatId = domain.chatId;
    messageOrm.senderId = domain.senderId;
    messageOrm.content = domain.content;
    messageOrm.isRead = domain.isRead;
    messageOrm.createdAt = domain.createdAt;

    return messageOrm;
  }

  static toDomain(entity: MessageEntity): Message {
    return new Message(
      entity.id,
      entity.chatId,
      entity.senderId,
      entity.content,
      entity.isRead,
      entity.createdAt,
    );
  }
}

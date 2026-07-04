import { MessageCreateDto } from '../../../interfaces/dtos/message/message-create.dto';
import { CreateMessageInput } from '../../../core/use-cases/message/message.use-case';
import { MessageType } from '../../../core/domain/enums';

export class MessageDtoDomainMapper {
  static toCreateMessageInput(
    dto: MessageCreateDto,
    senderId: string,
  ): CreateMessageInput {
    return {
      chatId: dto.chatId,
      senderId: senderId,
      content: dto.content,
      type: dto.type || MessageType.TEXT,
      contentType: dto.contentType || null,
    };
  }
}

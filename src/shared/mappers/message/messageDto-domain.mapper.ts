import { MessageCreateDto } from '../../../interfaces/dtos/message/message-create.dto';
import { CreateMessageInput } from '../../../core/use-cases/message/message.use-case';

export class MessageDtoDomainMapper {
  static toCreateMessageInput(dto: MessageCreateDto, senderId: string): CreateMessageInput {
    return {
      chatId: dto.chatId,
      senderId: senderId,
      content: dto.content,
    };
  }
}

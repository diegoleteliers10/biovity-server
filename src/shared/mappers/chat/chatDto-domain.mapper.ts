import { ChatCreateDto } from '../../../interfaces/dtos/chat/chat-create.dto';
import { CreateChatInput } from '../../../core/use-cases/chat/chat.use-case';

export class ChatDtoDomainMapper {
  static toCreateChatInput(dto: ChatCreateDto): CreateChatInput {
    return {
      recruiterId: dto.recruiterId,
      professionalId: dto.professionalId,
      lastMessage: dto.lastMessage,
    };
  }
}

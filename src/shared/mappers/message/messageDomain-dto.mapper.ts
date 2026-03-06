import { Message } from '../../../core/domain/entities/message.entity';
import { MessageResponseDto } from '../../../interfaces/dtos/message/message-response.dto';

export class MessageDomainDtoMapper {
  static toDto(domain: Message): MessageResponseDto {
    const dto = new MessageResponseDto();
    dto.id = domain.id;
    dto.chatId = domain.chatId;
    dto.senderId = domain.senderId;
    dto.content = domain.content;
    dto.isRead = domain.isRead;
    dto.createdAt = domain.createdAt;
    return dto;
  }
}

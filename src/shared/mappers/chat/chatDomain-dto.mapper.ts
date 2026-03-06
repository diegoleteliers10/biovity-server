import { Chat } from '../../../core/domain/entities/chat.entity';
import { ChatResponseDto } from '../../../interfaces/dtos/chat/chat-response.dto';

export class ChatDomainDtoMapper {
  static toDto(domain: Chat): ChatResponseDto {
    const dto = new ChatResponseDto();
    dto.id = domain.id;
    dto.recruiterId = domain.recruiterId;
    dto.professionalId = domain.professionalId;
    dto.jobId = domain.jobId;
    dto.lastMessage = domain.lastMessage;
    dto.unreadCountRecruiter = domain.unreadCountRecruiter;
    dto.unreadCountProfessional = domain.unreadCountProfessional;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
  }
}

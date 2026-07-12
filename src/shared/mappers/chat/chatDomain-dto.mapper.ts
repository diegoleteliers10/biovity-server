import { Chat } from '../../../core/domain/entities/chat.entity';
import { ChatResponseDto } from '../../../interfaces/dtos/chat/chat-response.dto';

export class ChatDomainDtoMapper {
  static toDto(
    domain: Chat,
    role: "recruiter" | "professional" = "recruiter",
  ): ChatResponseDto {
    const dto = new ChatResponseDto();
    dto.id = domain.id;
    dto.recruiterId = domain.recruiterId;
    dto.professionalId = domain.professionalId;
    dto.lastMessage = domain.lastMessage;
    dto.unreadCountRecruiter = domain.unreadCountRecruiter;
    dto.unreadCountProfessional = domain.unreadCountProfessional;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    dto.isPinned =
      role === "recruiter" ? domain.isPinnedByRecruiter : domain.isPinnedByProfessional;
    dto.isArchived =
      role === "recruiter" ? domain.isArchivedByRecruiter : domain.isArchivedByProfessional;
    return dto;
  }
}

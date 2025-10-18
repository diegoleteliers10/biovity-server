import { ResumeEntity } from '../../../infrastructure/database/orm/index';
import { ResumeResponseDto } from '../../../interfaces/dtos/resume/resume-response.dto';

export class ResumeOrmDtoMapper {
  static toDto(entity: ResumeEntity): ResumeResponseDto {
    const dto = new ResumeResponseDto();
    dto.id = entity.id;
    dto.userId = entity.userId;
    dto.summary = entity.summary;
    dto.experiences = entity.experiences;
    dto.education = entity.education;
    dto.skills = entity.skills;
    dto.certifications = entity.certifications;
    dto.languages = entity.languages;
    dto.links = entity.links;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;

    return dto;
  }
}

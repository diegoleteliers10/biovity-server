import { Resume } from '../../../core/domain/entities/resume.entity';
import { ResumeResponseDto } from '../../../interfaces/dtos/resume/resume-response.dto';

export class ResumeDomainDtoMapper {
  static toDto(domain: Resume): ResumeResponseDto {
    const dto = new ResumeResponseDto();
    dto.id = domain.id;
    dto.userId = domain.userId;
    dto.summary = domain.summary;
    dto.experiences = domain.experiences || [];
    dto.education = domain.education || [];
    dto.skills = domain.skills || [];
    dto.certifications = domain.certifications || [];
    dto.languages = domain.languages || [];
    dto.links = domain.links || [];
    dto.cvFile = domain.cvFile;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;

    return dto;
  }
}

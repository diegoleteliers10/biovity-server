import { Resume } from '../../core/domain/entities/resume.entity';
import { ResumeEntity } from '../../infrastructure/database/orm/resume.entity';

export class ResumeMapper {
  static toDomain(entity: ResumeEntity): Resume {
    return new Resume(
      entity.id,
      entity.userId,
      entity.summary,
      entity.experiences,
      entity.education,
      entity.skills,
      entity.certifications,
      entity.languages,
      entity.links,
      entity.createdAt,
      entity.updatedAt,
    );
  }

  static toEntity(domain: Resume): ResumeEntity {
    const entity = new ResumeEntity();
    entity.id = domain.id;
    entity.userId = domain.userId;
    entity.summary = domain.summary;
    entity.experiences = domain.experiences;
    entity.education = domain.education;
    entity.skills = domain.skills;
    entity.certifications = domain.certifications;
    entity.languages = domain.languages;
    entity.links = domain.links;
    entity.createdAt = domain.createdAt;
    entity.updatedAt = domain.updatedAt;
    return entity;
  }
}

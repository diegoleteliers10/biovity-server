import { Resume, ResumeSkill } from '../../../core/domain/entities/index';
import { ResumeEntity } from '../../../infrastructure/database/orm/index';

export class ResumeDomainOrmMapper {
  static toOrm(domain: Resume): ResumeEntity {
    const resumeOrm = new ResumeEntity();
    resumeOrm.id = domain.id;
    resumeOrm.userId = domain.userId;
    resumeOrm.summary = domain.summary;
    resumeOrm.experiences = domain.experiences || [];
    resumeOrm.education = domain.education || [];
    resumeOrm.skills = domain.skills || [];
    resumeOrm.certifications = domain.certifications || [];
    resumeOrm.languages = domain.languages || [];
    resumeOrm.links = domain.links || [];
    resumeOrm.cvFile = domain.cvFile;
    resumeOrm.createdAt = domain.createdAt;
    resumeOrm.updatedAt = domain.updatedAt;

    return resumeOrm;
  }

  static toDomain(entity: ResumeEntity): Resume {
    return new Resume(
      entity.id,
      entity.userId,
      entity.summary,
      entity.experiences || [],
      entity.education || [],
      // Legacy rows store bare skill names instead of objects.
      (entity.skills || []).map(skill =>
        typeof skill === 'string'
          ? new ResumeSkill(skill)
          : new ResumeSkill(skill.name, skill.level),
      ),
      entity.certifications || [],
      entity.languages || [],
      entity.links || [],
      entity.cvFile,
      entity.createdAt,
      entity.updatedAt,
    );
  }
}

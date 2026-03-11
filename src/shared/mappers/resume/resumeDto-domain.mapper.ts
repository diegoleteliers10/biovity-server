import { ResumeCreateDto } from '../../../interfaces/dtos/resume/resume-create.dto';
import { CreateResumeInput } from '../../../core/use-cases/resume/resume.use-case';

export class ResumeDtoDomainMapper {
  static toCreateResumeInput(dto: ResumeCreateDto): CreateResumeInput {
    return {
      userId: dto.userId,
      summary: dto.summary,
      experiences: dto.experiences?.map(exp => ({
        title: exp.title,
        startYear: exp.startYear,
        endYear: exp.endYear,
        stillWorking: exp.stillWorking,
        company: exp.company,
        description: exp.description,
      })),
      education: dto.education?.map(edu => ({
        title: edu.title,
        startYear: edu.startYear,
        endYear: edu.endYear,
        stillStudying: edu.stillStudying,
        institute: edu.institute,
      })),
      skills: dto.skills?.map(skill => ({
        name: skill.name,
        level: skill.level,
      })),
      certifications: dto.certifications?.map(cert => ({
        title: cert.title,
        date: cert.date,
        link: cert.link,
        company: cert.company,
      })),
      languages: dto.languages?.map(lang => ({
        name: lang.name,
        level: lang.level,
      })),
      links: dto.links,
      cvFile: dto.cvFile
        ? {
            url: dto.cvFile.url,
            originalName: dto.cvFile.originalName,
            mimeType: dto.cvFile.mimeType,
            size: dto.cvFile.size,
            uploadedAt: dto.cvFile.uploadedAt,
          }
        : undefined,
    };
  }
}

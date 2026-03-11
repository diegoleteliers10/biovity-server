export class ResumeExperience {
  constructor(
    public title: string,
    public startYear: string,
    public endYear?: string,
    public stillWorking?: boolean,
    public company?: string,
    public description?: string,
  ) {}
}

export class ResumeEducation {
  constructor(
    public title: string,
    public startYear: string,
    public endYear?: string,
    public stillStudying?: boolean,
    public institute?: string,
  ) {}
}

export enum SkillLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export class ResumeSkill {
  constructor(
    public name: string,
    public level?: SkillLevel,
  ) {}
}

export enum LanguageLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export class ResumeLanguage {
  constructor(
    public name: string,
    public level?: LanguageLevel,
  ) {}
}

export class ResumeCertification {
  constructor(
    public title: string,
    public date?: string,
    public link?: string,
    public company?: string,
  ) {}
}

export class Resume {
  constructor(
    public id: string,
    public userId: string,
    public summary?: string,
    public experiences: ResumeExperience[] = [],
    public education: ResumeEducation[] = [],
    public skills: ResumeSkill[] = [],
    public certifications: ResumeCertification[] = [],
    public languages: ResumeLanguage[] = [],
    public links: { url: string }[] = [],
    public cvFile?: {
      url: string;
      originalName?: string;
      mimeType?: string;
      size?: number;
      uploadedAt?: Date;
    },
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}
}

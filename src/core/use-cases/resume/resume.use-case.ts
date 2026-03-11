import {
  Resume,
  ResumeExperience,
  ResumeEducation,
  ResumeSkill,
  ResumeLanguage,
  ResumeCertification,
} from '../../domain/entities/resume.entity';

export interface IResumeUseCase {
  createResume(data: CreateResumeInput): Promise<Resume>;
  getResumeById(id: string): Promise<Resume | null>;
  getResumeByUserId(userId: string): Promise<Resume | null>;
  getAllResumes(): Promise<Resume[]>;
  updateResume(id: string, data: UpdateResumeInput): Promise<Resume | null>;
  deleteResume(id: string): Promise<boolean>;
}

export interface CreateResumeInput {
  userId: string;
  summary?: string;
  experiences?: ResumeExperience[];
  education?: ResumeEducation[];
  skills?: ResumeSkill[];
  certifications?: ResumeCertification[];
  languages?: ResumeLanguage[];
  links?: { url: string }[];
  cvFile?: CvFileInput;
}

export interface UpdateResumeInput {
  summary?: string;
  experiences?: ResumeExperience[];
  education?: ResumeEducation[];
  skills?: ResumeSkill[];
  certifications?: ResumeCertification[];
  languages?: ResumeLanguage[];
  links?: { url: string }[];
  cvFile?: CvFileInput;
}

export interface CvFileInput {
  url: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: Date;
}

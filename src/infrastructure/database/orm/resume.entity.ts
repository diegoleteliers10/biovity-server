import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

export enum SkillLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export enum LanguageLevel {
  ADVANCED = 'advanced',
  INTERMEDIATE = 'intermediate',
  ENTRY = 'entry',
}

export class ResumeExperienceEntity {
  title: string;
  startYear: string;
  endYear?: string;
  stillWorking?: boolean;
  company?: string;
  description?: string;
}

export class ResumeEducationEntity {
  title: string;
  startYear: string;
  endYear?: string;
  stillStudying?: boolean;
  institute?: string;
}

export class ResumeSkillEntity {
  name: string;
  level?: SkillLevel;
}

export class ResumeLanguageEntity {
  name: string;
  level?: LanguageLevel;
}

export class ResumeCertificationEntity {
  title: string;
  date?: string;
  link?: string;
  company?: string;
}

export class CvFileEntity {
  url: string;
  originalName?: string;
  mimeType?: string;
  size?: number;
  uploadedAt?: Date;
}

@Entity('resume')
export class ResumeEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public userId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  public user: UserEntity;

  @Column({ type: 'text', nullable: true })
  public summary?: string;

  @Column({ type: 'json', nullable: true })
  public experiences: ResumeExperienceEntity[];

  @Column({ type: 'json', nullable: true })
  public education: ResumeEducationEntity[];

  @Column({ type: 'json', nullable: true })
  public skills: ResumeSkillEntity[];

  @Column({ type: 'json', nullable: true })
  public certifications: ResumeCertificationEntity[];

  @Column({ type: 'json', nullable: true })
  public languages: ResumeLanguageEntity[];

  @Column({ type: 'json', nullable: true })
  public links: { url: string }[];

  @Column({ type: 'json', nullable: true })
  public cvFile?: CvFileEntity;

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();
}

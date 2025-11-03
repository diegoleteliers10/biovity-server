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

interface Certificates {
  name: string;
  issuer: string;
  dateIssued: Date;
  expirationDate?: Date;
  credentialId?: string;
  credentialUrl?: string;
}

interface Languages {
  name: string;
  proficiency: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Nativo';
}

interface Links {
  url: string;
}

export interface FileInfo {
  url: string;
  originalName: string;
  mimeType: string;
  size: number; // bytes
  uploadedAt: Date;
}

interface Education {
  institution: string;
  level: 'Primaria' | 'Secundaria' | 'Superior';
  degree: string;
  startDate: Date;
  endDate?: Date;
  description?: string;
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
  public experiences: Education[];

  @Column({ type: 'json', nullable: true })
  public education: {
    institution: string;
    level: 'Primaria' | 'Secundaria' | 'Superior';
    degree: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
  }[];

  @Column({ type: 'json', nullable: true })
  public skills: string[];

  @Column({ type: 'json', nullable: true })
  public certifications: Certificates[];

  @Column({ type: 'json', nullable: true })
  public languages: Languages[];

  @Column({ type: 'json', nullable: true })
  public links: Links[];

  @Column({ type: 'json', nullable: true })
  public cvFile?: FileInfo;

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();

  // Método de dominio útil
  public hasCvFile(): boolean {
    return !!this.cvFile?.url;
  }
}

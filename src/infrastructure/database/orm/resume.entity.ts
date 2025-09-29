import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

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

  @Column({ type: 'json', default: '[]' })
  public experiences: {
    jobTitle: string;
    company: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
    achievements?: string[];
  }[];

  @Column({ type: 'json', default: '[]' })
  public education: {
    institution: string;
    level: 'Primaria' | 'Secundaria' | 'Superior';
    degree: string;
    startDate: Date;
    endDate?: Date;
    description?: string;
  }[];

  @Column({ type: 'json', default: '[]' })
  public skills: string[];

  @Column({ type: 'json', default: '[]' })
  public certifications: string[];

  @Column({ type: 'json', default: '[]' })
  public languages: {
    name: string;
    proficiency: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Nativo';
  }[];

  @Column({ type: 'json', default: '[]' })
  public links: string[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;
}

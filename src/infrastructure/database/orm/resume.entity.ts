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
  public experiences: Record<string, unknown>[];

  @Column({ type: 'json', nullable: true })
  public education: Record<string, unknown>[];

  @Column({ type: 'json', nullable: true })
  public skills: string[];

  @Column({ type: 'json', nullable: true })
  public certifications: Record<string, unknown>[];

  @Column({ type: 'json', nullable: true })
  public languages: Record<string, unknown>[];

  @Column({ type: 'json', nullable: true })
  public links: { url: string }[];

  @Column({ type: 'json', nullable: true })
  public cvFile?: {
    url: string;
    originalName?: string;
    mimeType?: string;
    size?: number;
    uploadedAt?: Date;
  };

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();
}

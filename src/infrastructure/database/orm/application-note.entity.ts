import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { ApplicationEntity } from './application.entity';
import { UserEntity } from './user.entity';

@Entity('application_note')
@Index('idx_app_note_application', ['applicationId', 'createdAt'])
export class ApplicationNoteEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'application_id', type: 'uuid' })
  public applicationId: string;

  @ManyToOne(() => ApplicationEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id' })
  public application: ApplicationEntity;

  @Column({ name: 'author_id', type: 'uuid' })
  public authorId: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'author_id' })
  public author: UserEntity;

  @Column({ type: 'text' })
  public content: string;

  @Column({ type: 'text', array: true, default: () => "'{}'::text[]" })
  public tags: string[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  public createdAt: Date;
}

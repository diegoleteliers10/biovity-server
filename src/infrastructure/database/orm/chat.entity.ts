import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { MessageEntity } from './message.entity';

@Entity('chat')
@Index('idx_chat_recruiterId', ['recruiterId'])
@Index('idx_chat_professionalId', ['professionalId'])
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public recruiterId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'recruiterId' })
  public recruiter: UserEntity;

  @Column({ nullable: false })
  public professionalId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'professionalId' })
  public professional: UserEntity;

  @Column({ nullable: true })
  public lastMessage?: string;

  @Column({ default: 0 })
  public unreadCountRecruiter: number;

  @Column({ default: 0 })
  public unreadCountProfessional: number;

  @Column({ name: 'is_pinned_recruiter', default: false })
  public isPinnedByRecruiter: boolean;

  @Column({ name: 'is_pinned_professional', default: false })
  public isPinnedByProfessional: boolean;

  @Column({ name: 'is_archived_recruiter', default: false })
  public isArchivedByRecruiter: boolean;

  @Column({ name: 'is_archived_professional', default: false })
  public isArchivedByProfessional: boolean;

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt?: Date;

  @OneToMany(() => MessageEntity, message => message.chat)
  public messages: MessageEntity[];
}

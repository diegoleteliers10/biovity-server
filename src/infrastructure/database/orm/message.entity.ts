import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatEntity } from './chat.entity';
import { UserEntity } from './user.entity';

@Entity('message')
export class MessageEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public chatId: string;

  @ManyToOne(() => ChatEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'chatId' })
  public chat: ChatEntity;

  @Column({ nullable: false })
  public senderId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'senderId' })
  public sender: UserEntity;

  @Column({ type: 'text', nullable: false })
  public content: string;

  @Column({ default: false })
  public isRead: boolean;

  @CreateDateColumn()
  public createdAt: Date = new Date();
}

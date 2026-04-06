import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { ChatEntity } from './chat.entity';
import { UserEntity } from './user.entity';

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  AUDIO = 'audio',
  IMAGE = 'image',
  EVENT = 'event',
}

export interface FileContent {
  url: string;
  name: string;
  size: number;
  mimeType: string;
}

export interface AudioContent {
  url: string;
  duration: number;
  mimeType: string;
}

export interface ImageContent {
  url: string;
  width?: number;
  height?: number;
  mimeType: string;
}

export interface EventContent {
  eventId: string;
  eventType: string;
  title: string;
}

export type MessageContent = string | FileContent | AudioContent | ImageContent | EventContent;

@Entity('message')
@Index('idx_message_chat', ['chatId'])
@Index('idx_message_sender', ['senderId'])
@Index('idx_message_chat_created_at', ['chatId', 'createdAt'])
@Index('idx_message_chat_unread', ['chatId'], { where: 'isRead = false' })
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

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
  })
  public type: MessageType;

  @Column({ type: 'jsonb', nullable: true })
  public contentType: MessageContent | null;

  @Column({ default: false })
  public isRead: boolean;

  @CreateDateColumn()
  public createdAt: Date = new Date();
}
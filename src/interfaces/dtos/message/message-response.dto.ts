import { IsString, IsUUID, IsBoolean, IsDate, IsEnum, IsOptional, IsObject } from 'class-validator';

export enum MessageTypeResponseDto {
  TEXT = 'text',
  FILE = 'file',
  AUDIO = 'audio',
  IMAGE = 'image',
  EVENT = 'event',
}

export class MessageResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  chatId: string;

  @IsUUID()
  senderId: string;

  @IsString()
  content: string;

  @IsEnum(MessageTypeResponseDto)
  type: 'text' | 'file' | 'audio' | 'image' | 'event';

  @IsOptional()
  @IsObject()
  contentType?: Record<string, unknown>;

  @IsBoolean()
  isRead: boolean;

  @IsDate()
  createdAt: Date;
}
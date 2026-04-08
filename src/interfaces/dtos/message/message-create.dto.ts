import {
  IsString,
  IsUUID,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum MessageTypeDto {
  TEXT = 'text',
  FILE = 'file',
  AUDIO = 'audio',
  IMAGE = 'image',
  EVENT = 'event',
}

export class FileContentDto {
  @IsString()
  url: string;

  @IsString()
  name: string;

  @IsOptional()
  size?: number;

  @IsString()
  mimeType: string;
}

export class AudioContentDto {
  @IsString()
  url: string;

  @IsOptional()
  duration?: number;

  @IsString()
  mimeType: string;
}

export class ImageContentDto {
  @IsString()
  url: string;

  @IsOptional()
  width?: number;

  @IsOptional()
  height?: number;

  @IsString()
  mimeType: string;
}

export class EventContentDto {
  @IsString()
  eventId: string;

  @IsString()
  eventType: string;

  @IsString()
  title: string;
}

export class MessageCreateDto {
  @IsUUID()
  chatId: string;

  @IsUUID()
  senderId: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(MessageTypeDto)
  type?: 'text' | 'file' | 'audio' | 'image' | 'event';

  @IsOptional()
  @IsObject()
  contentType?: Record<string, unknown>;
}

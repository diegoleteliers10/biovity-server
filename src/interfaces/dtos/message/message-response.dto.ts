import {
  IsString,
  IsUUID,
  IsBoolean,
  IsDate,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { MessageType } from '../../../core/domain/enums';

export class MessageResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  chatId: string;

  @IsUUID()
  senderId: string;

  @IsString()
  content: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsObject()
  contentType?: Record<string, unknown>;

  @IsBoolean()
  isRead: boolean;

  @IsDate()
  createdAt: Date;
}

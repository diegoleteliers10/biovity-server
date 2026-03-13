import { IsString, IsUUID, IsBoolean, IsDate } from 'class-validator';

export class MessageResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  chatId: string;

  @IsUUID()
  senderId: string;

  @IsString()
  content: string;

  @IsBoolean()
  isRead: boolean;

  @IsDate()
  createdAt: Date;
}

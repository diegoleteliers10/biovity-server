import { IsString, IsUUID } from 'class-validator';

export class MessageCreateDto {
  @IsUUID()
  chatId: string;

  @IsUUID()
  senderId: string;

  @IsString()
  content: string;
}

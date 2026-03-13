import { IsString, IsOptional, IsUUID } from 'class-validator';

export class ChatCreateDto {
  @IsUUID()
  recruiterId: string;

  @IsUUID()
  professionalId: string;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsOptional()
  @IsString()
  lastMessage?: string;
}

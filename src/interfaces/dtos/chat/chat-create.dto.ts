import { IsString, IsOptional, IsUUID } from 'class-validator';

export class ChatCreateDto {
  @IsUUID()
  recruiterId: string;

  @IsUUID()
  professionalId: string;

  @IsUUID()
  organizationId: string;

  @IsOptional()
  @IsString()
  lastMessage?: string;
}

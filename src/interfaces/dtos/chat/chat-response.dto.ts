import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  IsDate,
} from 'class-validator';

export class ChatResponseDto {
  @IsUUID()
  id: string;

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

  @IsNumber()
  unreadCountRecruiter: number;

  @IsNumber()
  unreadCountProfessional: number;

  @IsDate()
  createdAt: Date;

  @IsOptional()
  @IsDate()
  updatedAt?: Date;
}

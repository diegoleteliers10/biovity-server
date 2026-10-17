import { IsArray, IsOptional, IsString, IsUUID, MinLength } from 'class-validator';

export class ApplicationNoteDto {
  @IsUUID()
  applicationId: string;

  @IsString()
  @MinLength(1)
  content: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

import { IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class ApplicationReopenDto {
  @IsUUID()
  stageId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  reason: string;
}

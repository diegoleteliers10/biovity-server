import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ApplicationStageUpdateDto {
  @IsUUID()
  stageId: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionNote?: string;

  @IsOptional()
  @IsUUID()
  rejectionReasonId?: string;
}

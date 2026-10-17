import { IsUUID, IsString, IsInt, IsOptional, IsBoolean, IsIn } from 'class-validator';
import { ApplicationStatus } from '../../../core/domain/enums';

export class PipelineStageResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  jobId: string;

  @IsString()
  name: string;

  @IsInt()
  order: number;

  @IsString()
  color: string;

  @IsIn(Object.values(ApplicationStatus))
  statusProjection: ApplicationStatus;

  @IsOptional()
  @IsString()
  systemKey: string | null;

  @IsBoolean()
  isArchived: boolean;
}

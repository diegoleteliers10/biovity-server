import { IsUUID, IsString, IsInt, IsOptional, Min, IsIn } from 'class-validator';
import { ApplicationStatus } from '../../../core/domain/enums';

export class CreatePipelineStageDto {
  @IsUUID()
  jobId: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsIn(Object.values(ApplicationStatus))
  statusProjection?: ApplicationStatus;
}

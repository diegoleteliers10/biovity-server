import { IsUUID, IsString, IsInt } from 'class-validator';

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
}

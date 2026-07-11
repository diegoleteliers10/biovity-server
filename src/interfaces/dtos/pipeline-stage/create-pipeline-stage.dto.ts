import { IsUUID, IsString, IsInt, IsOptional, Min } from 'class-validator';

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
}

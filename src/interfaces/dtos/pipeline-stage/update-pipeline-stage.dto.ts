import { IsString, IsOptional } from 'class-validator';

export class UpdatePipelineStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  color?: string;
}

import { IsArray, IsUUID } from 'class-validator';

export class ReorderPipelineStagesDto {
  @IsArray()
  @IsUUID('4', { each: true })
  stageIds: string[];
}

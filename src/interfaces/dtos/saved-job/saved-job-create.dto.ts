import { IsUUID } from 'class-validator';

export class SavedJobCreateDto {
  @IsUUID()
  userId: string;

  @IsUUID()
  jobId: string;
}

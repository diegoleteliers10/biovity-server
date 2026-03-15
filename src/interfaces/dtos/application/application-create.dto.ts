import { IsUUID } from 'class-validator';

export class ApplicationCreateDto {
  @IsUUID()
  jobId: string;

  @IsUUID()
  candidateId: string;
}

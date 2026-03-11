import {
  IsString,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class ApplicationCreateDto {
  @IsUUID()
  jobId: string;

  @IsUUID()
  candidateId: string;
}

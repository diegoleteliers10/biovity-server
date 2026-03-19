import { IsUUID, IsDateString } from 'class-validator';

export class SavedJobResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsUUID()
  jobId: string;

  @IsDateString()
  createdAt: Date;

  // Optional: include job details in response
  job?: {
    id: string;
    title: string;
    organizationId: string;
    status: string;
  };
}

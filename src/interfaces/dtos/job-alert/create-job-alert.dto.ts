import { IsUUID, IsString, IsOptional, IsIn, MaxLength } from 'class-validator';
import { JobAlertFrequency } from '../../../core/domain/enums';

export class CreateJobAlertDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  keywords?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsIn(Object.values(JobAlertFrequency))
  frequency?: JobAlertFrequency;
}

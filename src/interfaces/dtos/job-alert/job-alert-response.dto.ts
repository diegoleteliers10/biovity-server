import {
  IsUUID,
  IsString,
  IsIn,
  IsDateString,
  IsOptional,
  MaxLength,
} from 'class-validator';
import { JobAlertFrequency } from '../../../core/domain/enums';

export class JobAlertResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  keywords: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category: string | null;

  @IsIn(Object.values(JobAlertFrequency))
  frequency: JobAlertFrequency;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;
}

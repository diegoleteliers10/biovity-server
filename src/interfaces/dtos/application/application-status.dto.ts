import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { ApplicationStatus } from '../../../core/domain/enums';

export class ApplicationStatusUpdateDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  rejectionNote?: string;

  @IsOptional()
  @IsUUID()
  rejectionReasonId?: string;
}

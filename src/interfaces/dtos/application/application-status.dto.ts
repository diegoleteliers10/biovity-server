import { IsEnum } from 'class-validator';
import { ApplicationStatus } from '../../../core/domain/enums';

export class ApplicationStatusUpdateDto {
  @IsEnum(ApplicationStatus)
  status: ApplicationStatus;
}

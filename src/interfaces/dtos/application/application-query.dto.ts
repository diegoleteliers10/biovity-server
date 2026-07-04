import {
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  Max,
  IsUUID,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApplicationStatus } from '../../../core/domain/enums';

export class ApplicationQueryDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @IsOptional()
  @IsUUID()
  jobId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsEnum(ApplicationStatus)
  status?: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === 'true' || value === true)
  includeAnswers?: boolean;
}

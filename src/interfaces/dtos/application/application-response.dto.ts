import {
  IsString,
  IsUUID,
  IsDateString,
  IsIn,
  IsNotEmpty,
  ValidateNested,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum ApplicationStatus {
  PENDIENTE = 'pendiente',
  OFERTA = 'oferta',
  ENTREVISTA = 'entrevista',
  RECHAZADO = 'rechazado',
  CONTRATADO = 'contratado',
}

export class JobSummaryDto {
  @IsUUID()
  id: string;

  @IsString()
  title: string;

  @IsString()
  organizationId: string;
}

export class CandidateSummaryDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  email: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  profession?: string;
}

export class ApplicationResponseDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsUUID()
  @IsNotEmpty()
  jobId: string;

  @ValidateNested()
  @Type(() => JobSummaryDto)
  job?: JobSummaryDto;

  @IsUUID()
  @IsNotEmpty()
  candidateId: string;

  @ValidateNested()
  @Type(() => CandidateSummaryDto)
  candidate?: CandidateSummaryDto;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;

  @IsString()
  @IsIn(['pendiente', 'oferta', 'entrevista', 'rechazado', 'contratado'])
  status: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';
}

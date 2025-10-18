import {
  IsString,
  IsUUID,
  IsDateString,
  IsIn,
  IsNotEmpty,
} from 'class-validator';

export class ApplicationResponseDto {
  @IsUUID()
  @IsNotEmpty()
  id: string;

  @IsUUID()
  @IsNotEmpty()
  jobId: string;

  @IsUUID()
  @IsNotEmpty()
  candidateId: string;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;

  @IsString()
  @IsIn(['pendiente', 'oferta', 'entrevista', 'rechazado', 'contratado'])
  status: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';
}

import {
  IsString,
  IsEnum,
} from 'class-validator';

export enum ApplicationStatus {
  PENDIENTE = 'pendiente',
  OFERTA = 'oferta',
  ENTREVISTA = 'entrevista',
  RECHAZADO = 'rechazado',
  CONTRATADO = 'contratado',
}

export class ApplicationStatusUpdateDto {
  @IsEnum(ApplicationStatus)
  status: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';
}

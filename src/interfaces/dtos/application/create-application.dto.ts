import { IsString, IsNotEmpty, IsEnum, IsOptional } from 'class-validator';

export class CreateApplicationDto {
  @IsString({ message: 'El ID del trabajo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del trabajo es requerido' })
  jobId: string;

  @IsString({ message: 'El ID del candidato debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El ID del candidato es requerido' })
  candidateId: string;

  @IsEnum(['pendiente', 'oferta', 'entrevista', 'rechazado', 'contratado'], {
    message:
      'El estado debe ser: pendiente, oferta, entrevista, rechazado o contratado',
  })
  @IsOptional()
  status?: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado' =
    'pendiente';
}

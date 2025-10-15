import { 
  IsEnum, 
  IsOptional 
} from 'class-validator';

export class UpdateApplicationDto {
  @IsEnum(['pendiente', 'oferta', 'entrevista', 'rechazado', 'contratado'], {
    message: 'El estado debe ser: pendiente, oferta, entrevista, rechazado o contratado'
  })
  @IsOptional()
  status?: 'pendiente' | 'oferta' | 'entrevista' | 'rechazado' | 'contratado';
}

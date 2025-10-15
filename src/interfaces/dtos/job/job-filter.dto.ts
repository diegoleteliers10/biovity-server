import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsPositive,
  Min,
  Max,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class JobFilterDto {
  @IsString({ message: 'El término de búsqueda debe ser una cadena de texto' })
  @IsOptional()
  search?: string;

  @IsString({ message: 'La ubicación debe ser una cadena de texto' })
  @IsOptional()
  location?: string;

  @IsEnum(['Full-time', 'Part-time', 'Contrato', 'Practica'], {
    message:
      'El tipo de empleo debe ser: Full-time, Part-time, Contrato o Practica',
  })
  @IsOptional()
  employmentType?: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica';

  @IsEnum(['Entrante', 'Junior', 'Mid-Senior', 'Senior', 'Ejecutivo'], {
    message:
      'El nivel de experiencia debe ser: Entrante, Junior, Mid-Senior, Senior o Ejecutivo',
  })
  @IsOptional()
  experienceLevel?:
    | 'Entrante'
    | 'Junior'
    | 'Mid-Senior'
    | 'Senior'
    | 'Ejecutivo';

  @IsNumber({}, { message: 'El salario mínimo debe ser un número' })
  @IsPositive({ message: 'El salario mínimo debe ser un número positivo' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  minSalary?: number;

  @IsNumber({}, { message: 'El salario máximo debe ser un número' })
  @IsPositive({ message: 'El salario máximo debe ser un número positivo' })
  @IsOptional()
  @Transform(({ value }) => parseFloat(value))
  maxSalary?: number;

  @IsString({
    message: 'El ID de la organización debe ser una cadena de texto',
  })
  @IsOptional()
  organizationId?: string;

  // Paginación
  @IsNumber({}, { message: 'La página debe ser un número' })
  @Min(1, { message: 'La página debe ser mayor a 0' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsNumber({}, { message: 'El límite debe ser un número' })
  @Min(1, { message: 'El límite debe ser mayor a 0' })
  @Max(100, { message: 'El límite no puede ser mayor a 100' })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;

  // Ordenamiento
  @IsString({
    message: 'El campo de ordenamiento debe ser una cadena de texto',
  })
  @IsOptional()
  sortBy?: string = 'createdAt';

  @IsEnum(['ASC', 'DESC'], {
    message: 'El orden debe ser ASC o DESC',
  })
  @IsOptional()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

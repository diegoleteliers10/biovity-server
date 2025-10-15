import {
  IsString,
  IsOptional,
  MinLength,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsPositive,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class BenefitDto {
  @IsString({ message: 'El título del beneficio debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título del beneficio es requerido' })
  title: string;

  @IsString({
    message: 'La descripción del beneficio debe ser una cadena de texto',
  })
  @IsOptional()
  description?: string;
}

export class UpdateJobDto {
  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsOptional()
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  title?: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  @MinLength(20, {
    message: 'La descripción debe tener al menos 20 caracteres',
  })
  description?: string;

  @IsNumber({}, { message: 'El salario debe ser un número' })
  @IsPositive({ message: 'El salario debe ser un número positivo' })
  @IsOptional()
  amount?: number;

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

  @IsArray({ message: 'Los beneficios deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => BenefitDto)
  @IsOptional()
  benefits?: BenefitDto[];
}

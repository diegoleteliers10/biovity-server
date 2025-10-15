import {
  IsString,
  IsNotEmpty,
  MinLength,
  IsNumber,
  IsEnum,
  IsArray,
  ValidateNested,
  IsPositive,
  IsOptional,
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

export class CreateJobDto {
  @IsString({
    message: 'El ID de la organización debe ser una cadena de texto',
  })
  @IsNotEmpty({ message: 'El ID de la organización es requerido' })
  organizationId: string;

  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es requerido' })
  @MinLength(5, { message: 'El título debe tener al menos 5 caracteres' })
  title: string;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La descripción es requerida' })
  @MinLength(20, {
    message: 'La descripción debe tener al menos 20 caracteres',
  })
  description: string;

  @IsNumber({}, { message: 'El salario debe ser un número' })
  @IsPositive({ message: 'El salario debe ser un número positivo' })
  @IsNotEmpty({ message: 'El salario es requerido' })
  amount: number;

  @IsString({ message: 'La ubicación debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La ubicación es requerida' })
  location: string;

  @IsEnum(['Full-time', 'Part-time', 'Contrato', 'Practica'], {
    message:
      'El tipo de empleo debe ser: Full-time, Part-time, Contrato o Practica',
  })
  @IsNotEmpty({ message: 'El tipo de empleo es requerido' })
  employmentType: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica';

  @IsEnum(['Entrante', 'Junior', 'Mid-Senior', 'Senior', 'Ejecutivo'], {
    message:
      'El nivel de experiencia debe ser: Entrante, Junior, Mid-Senior, Senior o Ejecutivo',
  })
  @IsNotEmpty({ message: 'El nivel de experiencia es requerido' })
  experienceLevel:
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

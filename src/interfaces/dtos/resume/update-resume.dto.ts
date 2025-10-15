import {
  IsString,
  IsOptional,
  IsArray,
  ValidateNested,
  IsEnum,
  IsDateString,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

class ExperienceDto {
  @IsString({ message: 'El título del trabajo debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título del trabajo es requerido' })
  jobTitle: string;

  @IsString({ message: 'El nombre de la empresa debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre de la empresa es requerido' })
  company: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  startDate: Date;

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  @IsOptional()
  endDate?: Date;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;

  @IsArray({ message: 'Los logros deben ser un array' })
  @IsString({ each: true, message: 'Cada logro debe ser una cadena de texto' })
  @IsOptional()
  achievements?: string[];
}

class EducationDto {
  @IsString({
    message: 'El nombre de la institución debe ser una cadena de texto',
  })
  @IsNotEmpty({ message: 'El nombre de la institución es requerido' })
  institution: string;

  @IsEnum(['Primaria', 'Secundaria', 'Superior'], {
    message: 'El nivel debe ser: Primaria, Secundaria o Superior',
  })
  @IsNotEmpty({ message: 'El nivel de educación es requerido' })
  level: 'Primaria' | 'Secundaria' | 'Superior';

  @IsString({ message: 'El título debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El título es requerido' })
  degree: string;

  @IsDateString({}, { message: 'La fecha de inicio debe ser una fecha válida' })
  @IsNotEmpty({ message: 'La fecha de inicio es requerida' })
  startDate: Date;

  @IsDateString({}, { message: 'La fecha de fin debe ser una fecha válida' })
  @IsOptional()
  endDate?: Date;

  @IsString({ message: 'La descripción debe ser una cadena de texto' })
  @IsOptional()
  description?: string;
}

class LanguageDto {
  @IsString({ message: 'El nombre del idioma debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre del idioma es requerido' })
  name: string;

  @IsEnum(['Principiante', 'Intermedio', 'Avanzado', 'Nativo'], {
    message:
      'La proficiencia debe ser: Principiante, Intermedio, Avanzado o Nativo',
  })
  @IsNotEmpty({ message: 'La proficiencia es requerida' })
  proficiency: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Nativo';
}

export class UpdateResumeDto {
  @IsString({ message: 'El resumen debe ser una cadena de texto' })
  @IsOptional()
  summary?: string;

  @IsArray({ message: 'Las experiencias deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => ExperienceDto)
  @IsOptional()
  experiences?: ExperienceDto[];

  @IsArray({ message: 'La educación debe ser un array' })
  @ValidateNested({ each: true })
  @Type(() => EducationDto)
  @IsOptional()
  education?: EducationDto[];

  @IsArray({ message: 'Las habilidades deben ser un array' })
  @IsString({
    each: true,
    message: 'Cada habilidad debe ser una cadena de texto',
  })
  @IsOptional()
  skills?: string[];

  @IsArray({ message: 'Las certificaciones deben ser un array' })
  @IsString({
    each: true,
    message: 'Cada certificación debe ser una cadena de texto',
  })
  @IsOptional()
  certifications?: string[];

  @IsArray({ message: 'Los idiomas deben ser un array' })
  @ValidateNested({ each: true })
  @Type(() => LanguageDto)
  @IsOptional()
  languages?: LanguageDto[];

  @IsArray({ message: 'Los enlaces deben ser un array' })
  @IsString({ each: true, message: 'Cada enlace debe ser una cadena de texto' })
  @IsOptional()
  links?: string[];
}

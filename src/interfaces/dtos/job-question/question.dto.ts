import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsUUID,
  IsArray,
  MinLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum QuestionType {
  TEXT = 'text',
  TEXTAREA = 'textarea',
  NUMBER = 'number',
  SELECT = 'select',
  MULTISELECT = 'multiselect',
  BOOLEAN = 'boolean',
  DATE = 'date',
}

export enum QuestionStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
}

export class QuestionOptionDto {
  @ApiProperty({ example: 'Option 1', description: 'Opción' })
  @IsString()
  value: string;
}

export class CreateQuestionDto {
  @ApiProperty({
    example: '¿Cuál es tu experiencia previa?',
    description: 'Etiqueta de la pregunta',
  })
  @IsString()
  @MinLength(1)
  label: string;

  @ApiPropertyOptional({
    example: 'Escribe tu respuesta aquí...',
    description: 'Texto de ayuda',
  })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({
    example: 'Esta pregunta es importante para evaluar tu perfil',
    description: 'Texto auxiliar',
  })
  @IsOptional()
  @IsString()
  helperText?: string;

  @ApiProperty({
    enum: QuestionType,
    example: QuestionType.TEXT,
    description: 'Tipo de pregunta',
  })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({
    example: ['Opción 1', 'Opción 2', 'Opción 3'],
    description: 'Opciones para tipos select/multiselect',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ example: false, description: '¿Es requerida?' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Orden de la pregunta' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    enum: QuestionStatus,
    example: QuestionStatus.DRAFT,
    description: 'Estado de la pregunta',
  })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}

export class UpdateQuestionDto {
  @ApiPropertyOptional({
    example: '¿Cuál es tu experiencia previa?',
    description: 'Etiqueta de la pregunta',
  })
  @IsOptional()
  @IsString()
  @MinLength(1)
  label?: string;

  @ApiPropertyOptional({
    example: 'Escribe tu respuesta aquí...',
    description: 'Texto de ayuda',
  })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({
    example: 'Esta pregunta es importante para evaluar tu perfil',
    description: 'Texto auxiliar',
  })
  @IsOptional()
  @IsString()
  helperText?: string;

  @ApiPropertyOptional({
    enum: QuestionType,
    example: QuestionType.TEXT,
    description: 'Tipo de pregunta',
  })
  @IsOptional()
  @IsEnum(QuestionType)
  type?: QuestionType;

  @ApiPropertyOptional({
    example: ['Opción 1', 'Opción 2', 'Opción 3'],
    description: 'Opciones para tipos select/multiselect',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  options?: string[];

  @ApiPropertyOptional({ example: false, description: '¿Es requerida?' })
  @IsOptional()
  @IsBoolean()
  required?: boolean;

  @ApiPropertyOptional({ example: 0, description: 'Orden de la pregunta' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  orderIndex?: number;

  @ApiPropertyOptional({
    enum: QuestionStatus,
    example: QuestionStatus.DRAFT,
    description: 'Estado de la pregunta',
  })
  @IsOptional()
  @IsEnum(QuestionStatus)
  status?: QuestionStatus;
}

export class ReorderQuestionItemDto {
  @ApiProperty({ format: 'uuid', description: 'ID de la pregunta' })
  @IsUUID()
  id: string;

  @ApiProperty({ example: 0, description: 'Nuevo orden' })
  @IsNumber()
  @Min(0)
  orderIndex: number;
}

export class ReorderQuestionsDto {
  @ApiPropertyOptional({
    type: [ReorderQuestionItemDto],
    description: 'Lista de preguntas con nuevo orden',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderQuestionItemDto)
  items?: ReorderQuestionItemDto[];
}

import {
  IsString,
  IsUUID,
  IsEnum,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { QuestionType, QuestionStatus } from './question.dto';

export class QuestionResponseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  jobId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId: string;

  @ApiProperty({ example: '¿Cuál es tu experiencia previa?' })
  @IsString()
  label: string;

  @ApiPropertyOptional({ example: 'Escribe tu respuesta aquí...' })
  @IsOptional()
  @IsString()
  placeholder?: string;

  @ApiPropertyOptional({
    example: 'Esta pregunta es importante para evaluar tu perfil',
  })
  @IsOptional()
  @IsString()
  helperText?: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  type: QuestionType;

  @ApiPropertyOptional({ example: ['Opción 1', 'Opción 2'] })
  @IsOptional()
  @IsString({ each: true })
  options?: string[];

  @ApiProperty({ example: false })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ example: 0 })
  @IsNumber()
  orderIndex: number;

  @ApiProperty({ enum: QuestionStatus })
  @IsEnum(QuestionStatus)
  status: QuestionStatus;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  updatedAt: Date;
}

export class AnswerResponseDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  id: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  applicationId: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  questionId: string;

  @ApiProperty({ example: 'Mi respuesta aquí...' })
  @IsString()
  value: string;

  @ApiProperty({ example: '2024-01-01T00:00:00.000Z' })
  @IsDateString()
  createdAt: Date;
}

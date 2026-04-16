import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsArray,
  ValidateNested,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApplicationAnswerDto {
  @ApiProperty({ format: 'uuid', description: 'ID de la pregunta' })
  @IsUUID()
  questionId: string;

  @ApiProperty({
    example: 'Mi respuesta aquí...',
    description: 'Valor de la respuesta',
  })
  @IsString()
  value: string;
}

export class ApplicationCreateDto {
  @ApiProperty({ format: 'uuid', description: 'ID del trabajo' })
  @IsUUID()
  jobId: string;

  @ApiProperty({ format: 'uuid', description: 'ID del candidato' })
  @IsUUID()
  candidateId: string;

  @ApiPropertyOptional({
    example: 'Estimado equipo de selección...',
    description: 'Carta de presentación',
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  coverLetter?: string;

  @ApiPropertyOptional({
    example: 800000,
    description: 'Salario mínimo esperado',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @ApiPropertyOptional({
    example: 1200000,
    description: 'Salario máximo esperado',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @ApiPropertyOptional({ example: 'USD', description: 'Moneda del salario' })
  @IsOptional()
  @IsString()
  salaryCurrency?: string;

  @ApiPropertyOptional({
    example: '2024-06-01',
    description: 'Fecha de disponibilidad',
  })
  @IsOptional()
  @IsDateString()
  availabilityDate?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/resume.pdf',
    description: 'URL del CV',
  })
  @IsOptional()
  @IsString()
  resumeUrl?: string;

  @ApiPropertyOptional({
    type: [ApplicationAnswerDto],
    description: 'Respuestas a las preguntas del trabajo',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ApplicationAnswerDto)
  answers?: ApplicationAnswerDto[];
}

import {
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AiProvider } from '../../../core/domain/enums/ai-provider';

export class CreateAiCredentialDto {
  @ApiProperty({
    enum: AiProvider,
    example: AiProvider.OPENAI,
    description: 'AI provider',
  })
  @IsEnum(AiProvider)
  provider: AiProvider;

  @ApiProperty({
    example: 'gpt-4o-mini',
    description: 'Model identifier for the chosen provider',
  })
  @IsString()
  @MinLength(1)
  @MaxLength(128)
  modelId: string;

  @ApiProperty({
    example: 'sk-...',
    description: 'API key for the chosen provider',
  })
  @IsString()
  @MinLength(10)
  @MaxLength(500)
  apiKey: string;

  @ApiPropertyOptional({ example: 'Work key', description: 'Optional label' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  label?: string;
}

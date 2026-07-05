import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AiCredentialResponseDto {
  @ApiProperty({ example: 'openai' })
  provider: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  modelId: string;

  @ApiProperty({ example: '••••ab3f', description: 'Masked key preview' })
  keyPreview: string;

  @ApiPropertyOptional({ example: 'Work key', nullable: true })
  label: string | null;

  @ApiProperty({ example: true })
  hasCredential: boolean;
}

export class AiCredentialListItemDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id: string;

  @ApiProperty({ example: 'openai' })
  provider: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  modelId: string;

  @ApiProperty({ example: '••••ab3f' })
  keyPreview: string;

  @ApiPropertyOptional({ example: 'Work key', nullable: true })
  label: string | null;

  @ApiProperty({ example: true })
  isActive: boolean;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class AiCredentialActiveDto {
  @ApiProperty({ example: 'openai' })
  provider: string;

  @ApiProperty({ example: 'gpt-4o-mini' })
  modelId: string;

  @ApiProperty({ example: 'sk-...' })
  apiKey: string;
}

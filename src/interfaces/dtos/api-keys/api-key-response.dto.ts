import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ApiKeyResponseDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  id: string;

  @ApiProperty({ example: 'Production MCP Key' })
  name: string;

  @ApiProperty({ example: 'bvty_live_Xk9m...' })
  keyPrefix: string;

  @ApiPropertyOptional({ example: ['mcp:read', 'jobs:search'] })
  scopes: string[];

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59.000Z' })
  lastUsedAt: Date | null;

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59.000Z' })
  expiresAt: Date | null;

  @ApiPropertyOptional({ example: null })
  revokedAt: Date | null;

  @ApiProperty({ example: '2025-01-01T00:00:00.000Z' })
  createdAt: Date;
}

export class ApiKeyCreateResponseDto extends ApiKeyResponseDto {
  @ApiProperty({
    example: 'bvty_live_abc123...',
    description: 'The raw API key (only shown once)',
  })
  key: string;
}

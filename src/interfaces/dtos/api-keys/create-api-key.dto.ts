import { IsString, IsArray, IsOptional, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({
    example: 'Production MCP Key',
    description: 'Name of the API key',
  })
  @IsString()
  name: string;

  @ApiPropertyOptional({
    example: ['mcp:read', 'jobs:search'],
    description: 'Scopes for the API key',
  })
  @IsArray()
  @IsOptional()
  scopes?: string[];

  @ApiPropertyOptional({
    example: '2025-12-31T23:59:59.000Z',
    description: 'Expiration date',
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

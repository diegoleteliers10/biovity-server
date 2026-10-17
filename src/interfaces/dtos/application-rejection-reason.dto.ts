import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateApplicationRejectionReasonDto {
  @ApiProperty({ maxLength: 120 })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label: string;
}

export class UpdateApplicationRejectionReasonDto {
  @ApiPropertyOptional({ maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ApplicationRejectionReasonResponseDto {
  id: string;
  organizationId: string;
  label: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

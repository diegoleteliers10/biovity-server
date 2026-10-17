import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

export class CreateCvUploadReservationDto {
  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion: number;
}

export class FinalizeCvUploadDto {
  @ApiProperty({ format: 'url' })
  @IsUrl({ require_protocol: true })
  url: string;

  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  originalName?: string;

  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  mimeType?: string;

  @ApiPropertyOptional({ minimum: 1, maximum: 10485760 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10485760)
  size?: number;
}

export class DeleteCvDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  expectedPath: string;

  @ApiProperty({ minimum: 0 })
  @IsInt()
  @Min(0)
  expectedVersion: number;
}

export class ClaimCvCleanupDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 50, default: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(50)
  limit = 20;
}

export class FinishCvCleanupDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  leaseToken: string;
}

export class FailCvCleanupDto extends FinishCvCleanupDto {
  @ApiProperty({ maxLength: 500 })
  @IsString()
  @MaxLength(500)
  error: string;
}

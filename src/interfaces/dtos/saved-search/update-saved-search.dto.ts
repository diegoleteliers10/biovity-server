import { IsString, IsOptional, IsBoolean, IsObject } from 'class-validator';

export class UpdateSavedSearchDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsObject()
  filters?: Record<string, unknown>;

  @IsOptional()
  @IsBoolean()
  notifyEnabled?: boolean;
}

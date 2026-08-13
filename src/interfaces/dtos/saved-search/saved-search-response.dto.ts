import {
  IsUUID,
  IsString,
  IsBoolean,
  IsDateString,
  IsObject,
} from 'class-validator';

export class SavedSearchResponseDto {
  @IsUUID()
  id: string;

  @IsUUID()
  organizationId: string;

  @IsString()
  name: string;

  @IsObject()
  filters: Record<string, unknown>;

  @IsBoolean()
  notifyEnabled: boolean;

  @IsDateString()
  createdAt: Date;

  @IsDateString()
  updatedAt: Date;
}

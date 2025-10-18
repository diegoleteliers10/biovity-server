import {
  IsString,
  IsOptional,
  IsObject,
  IsDate,
  IsUUID,
} from 'class-validator';

export class OrganizationResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  website: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;

  // No incluimos jobs ni subscription por seguridad/simplicidad en la respuesta básica
}

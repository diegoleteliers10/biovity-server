import {
  IsString,
  IsUrl,
  IsOptional,
  IsNotEmpty,
  MinLength,
  IsObject,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class AddressDto {
  @IsString({ message: 'La calle debe ser una cadena de texto' })
  @IsOptional()
  street?: string;

  @IsString({ message: 'La ciudad debe ser una cadena de texto' })
  @IsOptional()
  city?: string;

  @IsString({ message: 'El estado debe ser una cadena de texto' })
  @IsOptional()
  state?: string;

  @IsString({ message: 'El país debe ser una cadena de texto' })
  @IsOptional()
  country?: string;

  @IsString({ message: 'El código postal debe ser una cadena de texto' })
  @IsOptional()
  zipCode?: string;
}

export class CreateOrganizationDto {
  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsUrl({}, { message: 'El website debe ser una URL válida' })
  @IsNotEmpty({ message: 'El website es requerido' })
  website: string;

  @IsString({ message: 'El teléfono debe ser una cadena de texto' })
  @IsOptional()
  phone?: string;

  @IsObject({ message: 'La dirección debe ser un objeto' })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddressDto)
  address?: AddressDto;
}

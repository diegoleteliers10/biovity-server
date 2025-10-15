import {
  IsEmail,
  IsString,
  IsEnum,
  MinLength,
  IsOptional,
  IsBoolean,
} from 'class-validator';

export class UpdateUserDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsOptional()
  email?: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsOptional()
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name?: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsOptional()
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password?: string;

  @IsEnum(['organización', 'persona'], {
    message: 'El tipo debe ser "organización" o "persona"',
  })
  @IsOptional()
  type?: 'organización' | 'persona';

  @IsBoolean({ message: 'isEmailVerified debe ser un valor booleano' })
  @IsOptional()
  isEmailVerified?: boolean;

  @IsBoolean({ message: 'isActive debe ser un valor booleano' })
  @IsOptional()
  isActive?: boolean;
}

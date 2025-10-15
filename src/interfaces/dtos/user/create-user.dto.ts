import {
  IsEmail,
  IsString,
  IsEnum,
  MinLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail({}, { message: 'El email debe tener un formato válido' })
  @IsNotEmpty({ message: 'El email es requerido' })
  email: string;

  @IsString({ message: 'El nombre debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'El nombre es requerido' })
  @MinLength(2, { message: 'El nombre debe tener al menos 2 caracteres' })
  name: string;

  @IsString({ message: 'La contraseña debe ser una cadena de texto' })
  @IsNotEmpty({ message: 'La contraseña es requerida' })
  @MinLength(8, { message: 'La contraseña debe tener al menos 8 caracteres' })
  password: string;

  @IsEnum(['organización', 'persona'], {
    message: 'El tipo debe ser "organización" o "persona"',
  })
  @IsNotEmpty({ message: 'El tipo es requerido' })
  type: 'organización' | 'persona';
}

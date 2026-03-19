import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationResponseDto } from '../organization/organization-response.dto';

export enum UserType {
  PROFESSIONAL = 'professional',
  ORGANIZATION = 'organization',
}

export class UserLocationDto {
  @ApiPropertyOptional({ example: 'Santiago', description: 'Ciudad' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({ example: 'Chile', description: 'País' })
  @IsOptional()
  @IsString()
  country?: string;
}

export class UserResponseDto {
  @ApiProperty({ format: 'uuid', description: 'ID del usuario' })
  @IsUUID()
  id: string;

  @ApiProperty({
    example: 'user@example.com',
    description: 'Email del usuario',
  })
  @IsString()
  email: string;

  @ApiProperty({ example: 'Juan Pérez', description: 'Nombre del usuario' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: UserType,
    example: UserType.PROFESSIONAL,
    description: 'Tipo de usuario',
  })
  @IsEnum(UserType)
  type: UserType;

  @ApiProperty({ example: false, description: '¿Email verificado?' })
  @IsBoolean()
  isEmailVerified: boolean;

  @ApiProperty({ example: true, description: '¿Usuario activo?' })
  @IsBoolean()
  isActive: boolean;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'ID de la organización',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    type: OrganizationResponseDto,
    description: 'Organización asociada',
  })
  @IsOptional()
  organization?: OrganizationResponseDto;

  @ApiPropertyOptional({
    example: 'https://example.com/avatar.jpg',
    description: 'Avatar URL',
  })
  @IsOptional()
  @IsString()
  avatar?: string;

  @ApiPropertyOptional({
    example: 'Ingeniero de software',
    description: 'Profesión',
  })
  @IsOptional()
  @IsString()
  profession?: string;

  @ApiPropertyOptional({
    example: '1990-01-01',
    description: 'Fecha de nacimiento',
  })
  @IsOptional()
  @IsString()
  birthday?: string;

  @ApiPropertyOptional({ example: '+56912345678', description: 'Teléfono' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ type: UserLocationDto, description: 'Ubicación' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserLocationDto)
  location?: UserLocationDto;
}

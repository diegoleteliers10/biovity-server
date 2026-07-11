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
import { UserType } from '../../../core/domain/enums';

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

export class UserNotificationChannelsDto {
  @ApiPropertyOptional({ example: false, description: 'Notificar por email' })
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notificar in-app' })
  @IsOptional()
  @IsBoolean()
  in_app?: boolean;
}

export class UserNotificationEventsDto {
  @ApiPropertyOptional({ example: true, description: 'Notificar postulaciones' })
  @IsOptional()
  @IsBoolean()
  application?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notificar entrevistas' })
  @IsOptional()
  @IsBoolean()
  interview?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notificar mensajes' })
  @IsOptional()
  @IsBoolean()
  message?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notificar alertas de empleo' })
  @IsOptional()
  @IsBoolean()
  job_alert?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Notificar sistema' })
  @IsOptional()
  @IsBoolean()
  system?: boolean;
}

export class UserNotificationPreferencesDto {
  @ApiPropertyOptional({ example: 'none', description: 'Frecuencia de resumen' })
  @IsOptional()
  @IsString()
  digest?: 'none' | 'immediate' | 'daily' | 'weekly';

  @ApiPropertyOptional({ type: UserNotificationChannelsDto, description: 'Canales de notificacion' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserNotificationChannelsDto)
  channels?: UserNotificationChannelsDto;

  @ApiPropertyOptional({ type: UserNotificationEventsDto, description: 'Eventos a notificar' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserNotificationEventsDto)
  events?: UserNotificationEventsDto;
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

  @ApiPropertyOptional({ type: UserNotificationPreferencesDto, description: 'Preferencias de notificación' })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserNotificationPreferencesDto)
  notificationPreferences?: UserNotificationPreferencesDto;
}

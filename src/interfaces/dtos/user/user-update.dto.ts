import {
  IsString,
  IsOptional,
  IsEnum,
  IsBoolean,
  IsUUID,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UserType } from '../../../core/domain/enums';

export class UserLocationDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  street?: string;
}

export class UserNotificationChannelsDto {
  @IsOptional()
  @IsBoolean()
  email?: boolean;

  @IsOptional()
  @IsBoolean()
  in_app?: boolean;
}

export class UserNotificationEventsDto {
  @IsOptional()
  @IsBoolean()
  application?: boolean;

  @IsOptional()
  @IsBoolean()
  interview?: boolean;

  @IsOptional()
  @IsBoolean()
  message?: boolean;

  @IsOptional()
  @IsBoolean()
  job_alert?: boolean;

  @IsOptional()
  @IsBoolean()
  system?: boolean;
}

export class UserNotificationPreferencesDto {
  @IsOptional()
  @IsString()
  digest?: 'none' | 'immediate' | 'daily' | 'weekly';

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserNotificationChannelsDto)
  channels?: UserNotificationChannelsDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserNotificationEventsDto)
  events?: UserNotificationEventsDto;
}

export class UserUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEnum(UserType)
  type?: UserType;

  @IsOptional()
  @IsBoolean()
  isEmailVerified?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  birthday?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserLocationDto)
  location?: UserLocationDto;

  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => UserNotificationPreferencesDto)
  notificationPreferences?: UserNotificationPreferencesDto;
}

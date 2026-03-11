import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDate,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { OrganizationResponseDto } from '../organization/organization-response.dto';

export enum UserType {
  PROFESSIONAL = 'professional',
  ORGANIZATION = 'organization',
}

export class UserLocationDto {
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  country?: string;
}

export class UserResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  email: string;

  @IsString()
  name: string;

  @IsEnum(UserType)
  type: UserType;

  @IsBoolean()
  isEmailVerified: boolean;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @IsOptional()
  organization?: OrganizationResponseDto;

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
}

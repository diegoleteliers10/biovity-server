import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { OrganizationResponseDto } from '../organization/organization-response.dto';

export enum UserType {
  PROFESSIONAL = 'professional',
  ORGANIZATION = 'organization',
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
}

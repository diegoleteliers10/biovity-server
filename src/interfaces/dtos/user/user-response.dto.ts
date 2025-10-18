import {
  IsString,
  IsBoolean,
  IsOptional,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { OrganizationResponseDto } from '../organization/organization-response.dto';

export class UserResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  email: string;

  @IsString()
  name: string;

  @IsEnum(['organización', 'persona'])
  type: 'organización' | 'persona';

  @IsBoolean()
  isEmailVerified: boolean;

  @IsBoolean()
  isActive: boolean;

  @IsOptional()
  organization?: OrganizationResponseDto;

  // No incluimos password, verificationToken por seguridad
}

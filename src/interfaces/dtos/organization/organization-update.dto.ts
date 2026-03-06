import {
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';
import { OrganizationAddressDto } from './organization-create.dto';

export class OrganizationUpdateDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  website?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: OrganizationAddressDto;
}

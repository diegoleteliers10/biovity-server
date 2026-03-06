import {
  IsString,
  IsOptional,
  IsObject,
} from 'class-validator';

export class OrganizationAddressDto {
  @IsOptional()
  @IsString()
  street?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  zipCode?: string;
}

export class OrganizationCreateDto {
  @IsString()
  name: string;

  @IsString()
  website: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: OrganizationAddressDto;
}

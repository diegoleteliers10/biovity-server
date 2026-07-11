import { IsString, IsOptional, IsObject } from 'class-validator';
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

  @IsOptional()
  @IsObject()
  integrations?: {
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
    enabled?: boolean;
  };

  @IsOptional()
  @IsString()
  logo?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  size?: string;
}

import {
  IsString,
  IsOptional,
  IsObject,
  IsDate,
  IsUUID,
} from 'class-validator';

export class OrganizationIntegrationsDto {
  slackWebhookUrl?: string;
  discordWebhookUrl?: string;
  enabled?: boolean;
}

export class OrganizationResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsString()
  website: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsObject()
  address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };

  @IsOptional()
  @IsObject()
  integrations?: OrganizationIntegrationsDto;

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

  @IsDate()
  createdAt: Date;

  @IsDate()
  updatedAt: Date;

  @IsOptional()
  subscriptionId?: string;

  // No incluimos jobs ni subscription por seguridad/simplicidad en la respuesta básica
}

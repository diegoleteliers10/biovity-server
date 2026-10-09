import { IsInt, IsObject, IsOptional, IsString, IsUUID } from 'class-validator';

/**
 * Public company profile. Never expose phone, address street details,
 * integrations (webhooks) or subscription data through this DTO.
 */
export class OrganizationPublicResponseDto {
  @IsUUID()
  id: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  website: string;

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

  @IsOptional()
  @IsInt()
  foundedYear?: number;

  @IsOptional()
  @IsString()
  linkedinUrl?: string;

  @IsOptional()
  @IsString()
  twitterUrl?: string;

  @IsOptional()
  @IsObject()
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };

  @IsInt()
  activeJobsCount: number;

  @IsString()
  createdAt: string;
}

import { IsString, IsUUID, IsEnum } from 'class-validator';
import { OrganizationMemberRole } from '../../../core/domain/entities/organization-member.entity';

export class AddMemberDto {
  @IsUUID()
  userId: string;

  @IsEnum(OrganizationMemberRole)
  role: OrganizationMemberRole;
}

export class UpdateMemberRoleDto {
  @IsEnum(OrganizationMemberRole)
  role: OrganizationMemberRole;
}

export class OrganizationMemberResponseDto {
  id: string;
  organizationId: string;
  userId: string;
  role: OrganizationMemberRole;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string | null;
  };
}
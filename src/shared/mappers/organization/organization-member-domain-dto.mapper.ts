import { OrganizationMember } from '../../../core/domain/entities/organization-member.entity';
import { OrganizationMemberResponseDto } from '../../../interfaces/dtos/organization/organization-member.dto';

export class OrganizationMemberDomainDtoMapper {
  static toDto(domain: OrganizationMember): OrganizationMemberResponseDto {
    const dto = new OrganizationMemberResponseDto();
    dto.id = domain.id;
    dto.organizationId = domain.organizationId;
    dto.userId = domain.userId;
    dto.role = domain.role;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    if (domain.user) {
      dto.user = {
        id: domain.user.id,
        name: domain.user.name,
        email: domain.user.email,
        avatar: domain.user.avatar ?? null,
      };
    }
    return dto;
  }
}
import { Organization } from '../../../core/domain/entities/organization.entity';
import { OrganizationResponseDto } from '../../../interfaces/dtos/organization/organization-response.dto';

export class OrganizationDomainDtoMapper {
  static toDto(domain: Organization): OrganizationResponseDto {
    const dto = new OrganizationResponseDto();
    dto.id = domain.id;
    dto.name = domain.name;
    dto.website = domain.website;
    dto.phone = domain.phone;
    dto.address = domain.address;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.updatedAt;
    return dto;
  }
}

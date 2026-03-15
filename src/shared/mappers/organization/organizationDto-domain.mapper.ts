import { OrganizationCreateDto } from '../../../interfaces/dtos/organization/organization-create.dto';
import { UpdateOrganizationInput } from '../../../core/use-cases/organization/organization.use-case';

export class OrganizationDtoDomainMapper {
  static toCreateOrganizationInput(
    dto: OrganizationCreateDto,
  ): UpdateOrganizationInput {
    return {
      name: dto.name,
      website: dto.website,
      phone: dto.phone,
      address: dto.address as Record<string, unknown> | undefined,
    };
  }

  static toCreateInputFromDto(
    dto: OrganizationCreateDto,
  ): UpdateOrganizationInput {
    return {
      name: dto.name,
      website: dto.website,
      phone: dto.phone,
      address: dto.address as Record<string, unknown> | undefined,
    };
  }
}

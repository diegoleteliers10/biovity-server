import { OrganizationEntity } from '../../../infrastructure/database/orm/index';
import { OrganizationResponseDto } from '../../../interfaces/dtos/organization/organization-response.dto';

export class OrganizationOrmDtoMapper {
  static toDto(entity: OrganizationEntity): OrganizationResponseDto {
    const dto = new OrganizationResponseDto();
    dto.id = entity.id;
    dto.name = entity.name;
    dto.website = entity.website;
    dto.phone = entity.phone;
    dto.address = entity.address;
    dto.createdAt = entity.createdAt;
    dto.updatedAt = entity.updatedAt;
    return dto;
  }
}

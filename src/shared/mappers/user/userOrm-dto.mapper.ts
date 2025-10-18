import { UserEntity } from '../../../infrastructure/database/orm/index';
import { UserResponseDto } from '../../../interfaces/dtos/user/user-response.dto';
import { OrganizationOrmDtoMapper } from '../organization/organizationOrm-dto.mapper';

export class UserOrmDtoMapper {
  static toDto(entity: UserEntity): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = entity.id;
    dto.email = entity.email;
    dto.name = entity.name;
    dto.type = entity.type;
    dto.isEmailVerified = entity.isEmailVerified;
    dto.isActive = entity.isActive;

    // Convert organization if it exists
    if (entity.organization) {
      dto.organization = OrganizationOrmDtoMapper.toDto(entity.organization);
    }

    return dto;
  }
}

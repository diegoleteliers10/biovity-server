import { User, UserType } from '../../../core/domain/entities/user.entity';
import {
  UserResponseDto,
  UserType as UserTypeDto,
} from '../../../interfaces/dtos/user/user-response.dto';
import { OrganizationDomainOrmMapper } from '../organization/organizationDomain-orm.mapper';

export class UserDomainDtoMapper {
  static toDto(domain: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = domain.id;
    dto.email = domain.email;
    dto.name = domain.name;
    dto.type = domain.type as UserTypeDto;
    dto.isEmailVerified = domain.isEmailVerified;
    dto.isActive = domain.isActive;
    dto.organizationId = domain.organizationId;
    dto.avatar = domain.avatar;
    dto.profession = domain.profession;

    if (domain.organization) {
      dto.organization = OrganizationDomainOrmMapper.toOrm(domain.organization);
    }

    return dto;
  }
}

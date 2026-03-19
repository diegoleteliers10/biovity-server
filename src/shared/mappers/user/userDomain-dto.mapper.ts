import { User } from '../../../core/domain/entities/user.entity';
import {
  UserResponseDto,
  UserType as UserTypeDto,
  UserLocationDto,
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
    dto.birthday = domain.birthday;
    dto.phone = domain.phone;

    if (domain.location) {
      const locationDto = new UserLocationDto();
      locationDto.city = domain.location.city;
      locationDto.country = domain.location.country;
      dto.location = locationDto;
    }

    if (domain.organization) {
      dto.organization = OrganizationDomainOrmMapper.toOrm(domain.organization);
    }

    return dto;
  }
}

import { User } from '../../../core/domain/entities/user.entity';
import {
  UserResponseDto,
  UserLocationDto,
  UserNotificationPreferencesDto,
  UserNotificationChannelsDto,
  UserNotificationEventsDto,
} from '../../../interfaces/dtos/user/user-response.dto';
import { OrganizationDomainOrmMapper } from '../organization/organizationDomain-orm.mapper';
import { UserType } from '../../../core/domain/enums';

export class UserDomainDtoMapper {
  static toDto(domain: User): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = domain.id;
    dto.email = domain.email;
    dto.name = domain.name;
    dto.type = domain.type;
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

    if (domain.notificationPreferences) {
      const prefsDto = new UserNotificationPreferencesDto();
      prefsDto.digest = domain.notificationPreferences.digest;
      if (domain.notificationPreferences.channels) {
        const channelsDto = new UserNotificationChannelsDto();
        channelsDto.email = domain.notificationPreferences.channels.email;
        channelsDto.in_app = domain.notificationPreferences.channels.in_app;
        prefsDto.channels = channelsDto;
      }
      if (domain.notificationPreferences.events) {
        const eventsDto = new UserNotificationEventsDto();
        eventsDto.application = domain.notificationPreferences.events.application;
        eventsDto.interview = domain.notificationPreferences.events.interview;
        eventsDto.message = domain.notificationPreferences.events.message;
        eventsDto.job_alert = domain.notificationPreferences.events.job_alert;
        eventsDto.system = domain.notificationPreferences.events.system;
        prefsDto.events = eventsDto;
      }
      dto.notificationPreferences = prefsDto;
    }

    if (domain.organization) {
      dto.organization = OrganizationDomainOrmMapper.toOrm(domain.organization);
    }

    return dto;
  }
}

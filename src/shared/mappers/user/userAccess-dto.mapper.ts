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
import type { UserAccessLevel } from '../../auth/user-access.policy';

export class UserAccessMapper {
  static toDto(domain: User, level: UserAccessLevel): UserResponseDto {
    const dto = new UserResponseDto();
    dto.id = domain.id;
    dto.type = domain.type;
    dto.isActive = domain.isActive;

    if (level === 'basic') {
      dto.email = domain.email;
      dto.name = domain.name;
      dto.isEmailVerified = domain.isEmailVerified;
      dto.organizationId = domain.organizationId;
      dto.createdAt = domain.createdAt;
      return dto;
    }

    if (level === 'chat') {
      dto.name = domain.name;
      dto.avatar = domain.avatar;
      dto.profession = domain.profession;
      return dto;
    }

    return UserAccessMapper.toFullDto(domain, dto);
  }

  private static toFullDto(
    domain: User,
    dto: UserResponseDto,
  ): UserResponseDto {
    dto.email = domain.email;
    dto.name = domain.name;
    dto.isEmailVerified = domain.isEmailVerified;
    dto.organizationId = domain.organizationId;
    dto.avatar = domain.avatar;
    dto.profession = domain.profession;
    dto.birthday = domain.birthday;
    dto.phone = domain.phone;
    dto.createdAt = domain.createdAt;
    dto.updatedAt = domain.cvUpdatedAt;

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
        eventsDto.application =
          domain.notificationPreferences.events.application;
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

    if (domain.skills) {
      dto.skills = domain.skills;
    }

    return dto;
  }
}

export { UserType };

import { UserUpdateDto } from '../../../interfaces/dtos/user/user-update.dto';
import { UpdateUserInput } from '../../../core/use-cases/user/user.use-case';
import { UserType } from '../../../core/domain/enums';

export class UserDtoDomainMapper {
  static toUpdateUserInput(dto: UserUpdateDto): UpdateUserInput {
    return {
      name: dto.name,
      type: dto.type,
      isEmailVerified: dto.isEmailVerified,
      isActive: dto.isActive,
      organizationId: dto.organizationId,
      avatar: dto.avatar,
      profession: dto.profession,
      birthday: dto.birthday,
      phone: dto.phone,
      location: dto.location,
    };
  }

  static toUserType(value: string): UserType {
    return UserType[value as keyof typeof UserType];
  }
}

import { UserResponseDto } from './user-response.dto';

export class UserPaginatedResponseDto {
  data: UserResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

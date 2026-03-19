import { ApplicationResponseDto } from './application-response.dto';

export class ApplicationPaginatedResponseDto {
  data: ApplicationResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

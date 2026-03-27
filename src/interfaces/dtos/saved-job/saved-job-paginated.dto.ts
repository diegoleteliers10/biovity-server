import { ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { SavedJobResponseDto } from './saved-job-response.dto';

export class SavedJobPaginatedResponseDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SavedJobResponseDto)
  data: SavedJobResponseDto[];

  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

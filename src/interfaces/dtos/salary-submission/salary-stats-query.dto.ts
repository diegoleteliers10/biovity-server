import { IsString, IsOptional } from 'class-validator';

export class SalaryStatsQueryDto {
  @IsOptional()
  @IsString()
  profession?: string;

  @IsOptional()
  @IsString()
  industry?: string;

  @IsOptional()
  @IsString()
  region?: string;
}

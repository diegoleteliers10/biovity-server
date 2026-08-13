import { IsInt } from 'class-validator';

export class SalaryStatsResponseDto {
  @IsInt()
  count: number;

  @IsInt()
  average: number;

  @IsInt()
  median: number;

  @IsInt()
  p25: number;

  @IsInt()
  p75: number;

  @IsInt()
  p90: number;
}

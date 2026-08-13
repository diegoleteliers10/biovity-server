import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { SalarySubmissionService } from '../../../core/services/salary-submission.service';
import { CreateSalarySubmissionDto } from '../../dtos/salary-submission/create-salary-submission.dto';
import { SalaryStatsQueryDto } from '../../dtos/salary-submission/salary-stats-query.dto';
import { SalarySubmissionResponseDto } from '../../dtos/salary-submission/salary-submission-response.dto';
import { SalaryStatsResponseDto } from '../../dtos/salary-submission/salary-stats-response.dto';
import { SalarySubmissionDtoDomainMapper } from '../../../shared/mappers/salary-submission/salarySubmissionDto-domain.mapper';
import { SalarySubmissionDomainDtoMapper } from '../../../shared/mappers/salary-submission/salarySubmissionDomain-dto.mapper';

@ApiTags('salaries')
@Controller('salaries')
export class SalaryController {
  constructor(private readonly service: SalarySubmissionService) {}

  @Post('submissions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar sueldo anónimo en CLP (Give to Get)' })
  async submit(
    @Body() dto: CreateSalarySubmissionDto,
  ): Promise<SalarySubmissionResponseDto> {
    const input = SalarySubmissionDtoDomainMapper.toCreateInput(dto);
    const { submission, rank } = await this.service.create(input);
    return SalarySubmissionDomainDtoMapper.toDto(submission, rank);
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Consultar agregados y percentiles nacionales en CLP',
  })
  async stats(
    @Query() query: SalaryStatsQueryDto,
  ): Promise<SalaryStatsResponseDto> {
    return this.service.getStats({
      profession: query.profession,
      industry: query.industry,
      region: query.region,
    });
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JobAlertService } from '../../../core/services/job-alert.service';
import { JobAlertDtoDomainMapper } from '../../../shared/mappers/job-alert/jobAlertDto-domain.mapper';
import { CreateJobAlertDto } from '../../dtos/job-alert/create-job-alert.dto';
import { JobAlertResponseDto } from '../../dtos/job-alert/job-alert-response.dto';
import { JobAlertDomainDtoMapper } from '../../../shared/mappers/job-alert/jobAlertDomain-dto.mapper';

@ApiTags('job-alerts')
@Controller('job-alerts')
export class JobAlertController {
  constructor(private readonly service: JobAlertService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateJobAlertDto): Promise<JobAlertResponseDto> {
    const input = JobAlertDtoDomainMapper.toCreateInput(dto);
    const jobAlert = await this.service.create(input);
    return JobAlertDomainDtoMapper.toDto(jobAlert);
  }

  @Get()
  async getByUserId(
    @Query('userId', ParseUUIDPipe) userId: string,
  ): Promise<JobAlertResponseDto[]> {
    const alerts = await this.service.getByUserId(userId);
    return alerts.map(alert => JobAlertDomainDtoMapper.toDto(alert));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId', ParseUUIDPipe) userId: string,
  ): Promise<void> {
    await this.service.delete(id, userId);
  }
}

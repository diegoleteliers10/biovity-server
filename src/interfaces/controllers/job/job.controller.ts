import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JobService } from '../../../core/services/job.service';
import { JobDtoDomainMapper } from '../../../shared/mappers/job/jobDto-domain.mapper';
import { JobCreateDto } from '../../dtos/job/job-create.dto';
import { JobResponseDto } from '../../dtos/job/job-response.dto';
import { JobDomainDtoMapper } from '../../../shared/mappers/job/jobDomain-dto.mapper';

@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createJob(@Body() dto: JobCreateDto): Promise<JobResponseDto> {
    const input = JobDtoDomainMapper.toCreateJobInput(dto);
    const job = await this.jobService.createJob(input);
    return JobDomainDtoMapper.toDto(job);
  }

  @Get(':id')
  async getJobById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto | null> {
    const job = await this.jobService.getJobById(id);
    return job ? JobDomainDtoMapper.toDto(job) : null;
  }

  @Get()
  async getAllJobs(): Promise<JobResponseDto[]> {
    const jobs = await this.jobService.getAllJobs();
    return jobs.map(job => JobDomainDtoMapper.toDto(job));
  }

  @Put(':id')
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: Partial<JobCreateDto>,
  ): Promise<JobResponseDto | null> {
    const input = JobDtoDomainMapper.toCreateJobInput(dto as JobCreateDto);
    const job = await this.jobService.updateJob(id, input);
    return job ? JobDomainDtoMapper.toDto(job) : null;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteJob(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.jobService.deleteJob(id);
  }
}

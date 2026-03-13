import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JobService } from '../../../core/services/job.service';
import { JobDtoDomainMapper } from '../../../shared/mappers/job/jobDto-domain.mapper';
import { JobCreateDto } from '../../dtos/job/job-create.dto';
import { JobResponseDto } from '../../dtos/job/job-response.dto';
import { JobDomainDtoMapper } from '../../../shared/mappers/job/jobDomain-dto.mapper';
import { JobQueryDto } from '../../dtos/job/job-query.dto';

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

  @Get(':id/with-applications')
  async getJobByIdWithApplications(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<any | null> {
    const result = await this.jobService.getJobByIdWithApplications(id);
    if (!result) return null;
    return {
      ...JobDomainDtoMapper.toDto(result.job),
      applicationsCount: result.applicationsCount,
    };
  }

  @Get()
  async getAllJobs(@Query() query: JobQueryDto): Promise<any> {
    const filters = {
      organizationId: query.organizationId,
      status: query.status,
      search: query.search,
    };

    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.jobService.getAllJobs(filters, pagination);

    return {
      data: result.data.map(job => JobDomainDtoMapper.toDto(job)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('organization/:organizationId')
  async getJobsByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: JobQueryDto,
  ): Promise<any> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.jobService.getAllJobsWithApplicationCounts(
      organizationId,
      pagination,
    );

    return {
      data: result.data.map(item => ({
        ...JobDomainDtoMapper.toDto(item.job),
        applicationsCount: item.applicationsCount,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
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
  async deleteJob(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.jobService.deleteJob(id);
  }
}

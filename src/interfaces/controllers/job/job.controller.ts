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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { JobService } from '../../../core/services/job.service';
import { JobDtoDomainMapper } from '../../../shared/mappers/job/jobDto-domain.mapper';
import { JobCreateDto } from '../../dtos/job/job-create.dto';
import { JobResponseDto } from '../../dtos/job/job-response.dto';

import { JobDomainDtoMapper } from '../../../shared/mappers/job/jobDomain-dto.mapper';
import { JobQueryDto } from '../../dtos/job/job-query.dto';

interface PaginatedJobResponse {
  data: JobResponseDto[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface JobWithCount {
  job: NonNullable<Awaited<ReturnType<JobService['getJobById']>>>;
  applicationsCount: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@ApiTags('jobs')
@Controller('jobs')
export class JobController {
  constructor(private readonly jobService: JobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una nueva oferta de trabajo' })
  @ApiResponse({
    status: 201,
    description: 'Oferta de trabajo creada exitosamente',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  @ApiBody({ type: JobCreateDto })
  async createJob(@Body() dto: JobCreateDto): Promise<JobResponseDto> {
    const input = JobDtoDomainMapper.toCreateJobInput(dto);
    const job = await this.jobService.createJob(input);
    return JobDomainDtoMapper.toDto(job);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una oferta de trabajo por ID' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID de la oferta de trabajo',
  })
  @ApiResponse({
    status: 200,
    description: 'Oferta de trabajo encontrada',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async getJobById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto | null> {
    const result = await this.jobService.getJobByIdWithApplicationCount(id);
    if (!result) return null;
    const jobDto = JobDomainDtoMapper.toDto(result.job);
    return {
      ...jobDto,
      totalApplications: result.totalApplications,
    } as JobResponseDto;
  }

  @Get()
  @ApiOperation({ summary: 'Obtener todas las ofertas de trabajo' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas de trabajo',
  })
  async getAllJobs(@Query() query: JobQueryDto): Promise<PaginatedJobResponse> {
    const filters = {
      organizationId: query.organizationId,
      status: query.status,
      search: query.search,
    };

    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result: PaginatedResult<JobResponseDto> = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };

    const jobsResult = (await this.jobService.getAllJobs(
      filters,
      pagination,
    )) as {
      data: unknown[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    } | null;
    if (jobsResult) {
      result.data = jobsResult.data.map((job: unknown) =>
        JobDomainDtoMapper.toDto(
          job as Parameters<typeof JobDomainDtoMapper.toDto>[0],
        ),
      );
      result.total = Number(jobsResult.total) || 0;
      result.page = Number(jobsResult.page) || 1;
      result.limit = Number(jobsResult.limit) || 10;
      result.totalPages = Number(jobsResult.totalPages) || 0;
    }

    return result;
  }

  @Get('organization/:organizationId')
  @ApiOperation({ summary: 'Obtener ofertas de una organización' })
  @ApiParam({
    name: 'organizationId',
    type: 'string',
    format: 'uuid',
    description: 'ID de la organización',
  })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas de la organización',
  })
  async getJobsByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: JobQueryDto,
  ): Promise<PaginatedJobResponse> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result: PaginatedJobResponse = {
      data: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    };

    const jobsResult = (await this.jobService.getAllJobsWithApplicationCounts(
      organizationId,
      pagination,
    )) as {
      data: JobWithCount[];
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    } | null;

    if (jobsResult) {
      result.data = jobsResult.data.map((item: JobWithCount) => ({
        ...JobDomainDtoMapper.toDto(item.job),
        applicationsCount: item.applicationsCount,
      }));
      result.total = Number(jobsResult.total) || 0;
      result.page = Number(jobsResult.page) || 1;
      result.limit = Number(jobsResult.limit) || 10;
      result.totalPages = Number(jobsResult.totalPages) || 0;
    }

    return result;
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar una oferta de trabajo' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID de la oferta de trabajo',
  })
  @ApiResponse({
    status: 200,
    description: 'Oferta actualizada exitosamente',
    type: JobResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  @ApiBody({ type: JobCreateDto })
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
  @ApiOperation({ summary: 'Eliminar una oferta de trabajo' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID de la oferta de trabajo',
  })
  @ApiResponse({ status: 204, description: 'Oferta eliminada exitosamente' })
  @ApiResponse({ status: 404, description: 'Oferta no encontrada' })
  async deleteJob(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.jobService.deleteJob(id);
  }

  @Put(':id/views')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Incrementar vistas de una oferta de trabajo' })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'ID de la oferta de trabajo',
  })
  @ApiResponse({
    status: 200,
    description: 'Vistas incrementadas',
    type: JobResponseDto,
  })
  async incrementViews(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto | null> {
    const job = await this.jobService.incrementJobViews(id);
    return job ? JobDomainDtoMapper.toDto(job) : null;
  }
}

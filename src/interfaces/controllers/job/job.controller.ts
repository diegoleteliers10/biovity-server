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
  NotFoundException,
  ForbiddenException,
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
import { JobUpdateDto } from '../../dtos/job/job-update.dto';
import { JobResponseDto } from '../../dtos/job/job-response.dto';

import { JobDomainDtoMapper } from '../../../shared/mappers/job/jobDomain-dto.mapper';
import { JobQueryDto } from '../../dtos/job/job-query.dto';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import type { JobSort } from '../../../core/repositories/job.repository';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

const SORT_FIELDS = ['createdat', 'title'] as const;
const SORT_DIRECTIONS = ['asc', 'desc'] as const;

function parseJobSort(raw: string | undefined): JobSort | undefined {
  if (!raw) return undefined;
  const [field, direction = 'desc'] = raw.split(':');
  const normalizedField = field.trim().toLowerCase();
  const normalizedDirection = direction.trim().toLowerCase();
  const isField = SORT_FIELDS.some(f => f === normalizedField);
  const isDirection = SORT_DIRECTIONS.some(d => d === normalizedDirection);
  if (!isField || !isDirection) return undefined;
  return {
    field: normalizedField === 'title' ? 'title' : 'createdAt',
    direction: normalizedDirection === 'asc' ? 'ASC' : 'DESC',
  };
}

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
@Roles('organization')
@Controller('jobs')
export class JobController {
  constructor(
    private readonly jobService: JobService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

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
  async createJob(
    @Body() dto: JobCreateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<JobResponseDto> {
    await this.organizationAccess.assertAccess(
      dto.organizationId,
      requester,
      'manage',
    );
    const input = JobDtoDomainMapper.toCreateJobInput(dto);
    const job = await this.jobService.createJob(input);
    return JobDomainDtoMapper.toDto(job);
  }

  @Get(':id')
  @Public()
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
  ): Promise<JobResponseDto> {
    const result = await this.jobService.getJobByIdWithApplicationCount(id);
    if (!result) throw new NotFoundException('Job not found');
    const jobDto = JobDomainDtoMapper.toDto(result.job);
    return {
      ...jobDto,
      totalApplications: result.totalApplications,
    };
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Obtener todas las ofertas de trabajo' })
  @ApiQuery({ name: 'organizationId', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'createdAt|title con :asc o :desc. Ej: sort=title:asc',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista de ofertas de trabajo',
  })
  async getAllJobs(@Query() query: JobQueryDto): Promise<PaginatedJobResponse> {
    const filters = {
      organizationId: query.organizationId,
      status: query.status,
      search: query.search,
      category: query.category,
      sort: parseJobSort(query.sort),
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
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PaginatedJobResponse> {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
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
  @ApiBody({ type: JobUpdateDto })
  async updateJob(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: JobUpdateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<JobResponseDto> {
    const existingJob = await this.jobService.getJobById(id);
    if (!existingJob) throw new NotFoundException('Job not found');
    await this.organizationAccess.assertJobAccess(id, requester, 'manage');
    if (
      dto.organizationId &&
      dto.organizationId !== existingJob.organizationId
    ) {
      throw new ForbiddenException(
        'No puedes cambiar la organización de una oferta.',
      );
    }
    const input = {
      organizationId: existingJob.organizationId,
      title: dto.title ?? existingJob.title,
      description: dto.description ?? existingJob.description,
      employmentType:
        dto.employmentType ?? existingJob.employmentType ?? undefined,
      experienceLevel:
        dto.experienceLevel ?? existingJob.experienceLevel ?? undefined,
      salary: (dto.salary ?? existingJob.salary) as Record<string, unknown>,
      location: (dto.location ?? existingJob.location) as Record<
        string,
        unknown
      >,
      benefits: (dto.benefits ?? existingJob.benefits) as unknown as Record<
        string,
        unknown
      >[],
      status: dto.status ?? existingJob.status,
      expiresAt: dto.expiresAt
        ? new Date(dto.expiresAt)
        : existingJob.expiresAt,
      category: dto.category ?? existingJob.category,
      requiredSkills: dto.requiredSkills ?? existingJob.requiredSkills,
      minExperience: dto.minExperience ?? existingJob.minExperience,
    };
    const job = await this.jobService.updateJob(id, input);
    if (!job) throw new NotFoundException('Job not found');
    return JobDomainDtoMapper.toDto(job);
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
  async deleteJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.organizationAccess.assertJobAccess(id, requester, 'manage');
    await this.jobService.deleteJob(id);
  }

  // View counting is a state change, so the canonical verb is POST.
  // PUT stays as a deprecated alias until the frontend stops calling it.
  @Post(':id/views')
  @Public()
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
  ): Promise<JobResponseDto> {
    return this.doIncrementViews(id);
  }

  @Put(':id/views')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa POST /jobs/:id/views',
  })
  async incrementViewsDeprecated(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<JobResponseDto> {
    return this.doIncrementViews(id);
  }

  private async doIncrementViews(id: string): Promise<JobResponseDto> {
    const job = await this.jobService.incrementJobViews(id);
    if (!job) throw new NotFoundException('Job not found');
    return JobDomainDtoMapper.toDto(job);
  }
}

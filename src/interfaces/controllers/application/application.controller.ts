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
import { ApiTags } from '@nestjs/swagger';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationDtoDomainMapper } from '../../../shared/mappers/application/applicationDto-domain.mapper';
import { ApplicationCreateDto } from '../../dtos/application/application-create.dto';
import { ApplicationResponseDto } from '../../dtos/application/application-response.dto';
import { ApplicationDomainDtoMapper } from '../../../shared/mappers/application/applicationDomain-dto.mapper';
import { ApplicationQueryDto } from '../../dtos/application/application-query.dto';
import { ApplicationPaginatedResponseDto } from '../../dtos/application/application-paginated.dto';
import { ApplicationStatusUpdateDto } from '../../dtos/application/application-status.dto';
import { ApplicationStatus } from '../../../core/domain/entities/application.entity';

@ApiTags('applications')
@Controller('applications')
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createApplication(
    @Body() dto: ApplicationCreateDto,
  ): Promise<ApplicationResponseDto> {
    const input = ApplicationDtoDomainMapper.toCreateApplicationInput(dto);
    const application = await this.applicationService.createApplication(input);
    return ApplicationDomainDtoMapper.toDto(application);
  }

  @Get(':id')
  async getApplicationById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<ApplicationResponseDto | null> {
    const application = await this.applicationService.getApplicationById(id);
    return application ? ApplicationDomainDtoMapper.toDto(application) : null;
  }

  @Get()
  async getAllApplications(
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationPaginatedResponseDto> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.applicationService.getApplicationsByJobId(
      query.jobId || '',
      pagination,
    );

    return {
      data: result.data.map(app => ApplicationDomainDtoMapper.toDto(app)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('job/:jobId')
  async getApplicationsByJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationPaginatedResponseDto> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.applicationService.getApplicationsByJobId(
      jobId,
      pagination,
    );

    return {
      data: result.data.map(app => ApplicationDomainDtoMapper.toDto(app)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('candidate/:candidateId')
  async getApplicationsByCandidate(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Query() query: ApplicationQueryDto,
  ): Promise<ApplicationPaginatedResponseDto> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.applicationService.getApplicationsByCandidateId(
      candidateId,
      pagination,
    );

    return {
      data: result.data.map(app => ApplicationDomainDtoMapper.toDto(app)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Put(':id/status')
  async updateApplicationStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplicationStatusUpdateDto,
  ): Promise<ApplicationResponseDto | null> {
    const application = await this.applicationService.updateApplicationStatus(
      id,
      dto.status as ApplicationStatus,
    );
    return application ? ApplicationDomainDtoMapper.toDto(application) : null;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteApplication(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.applicationService.deleteApplication(id);
  }
}

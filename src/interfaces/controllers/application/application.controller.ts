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
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ApplicationService } from '../../../core/services/application.service';
import { ApplicationDtoDomainMapper } from '../../../shared/mappers/application/applicationDto-domain.mapper';
import { ApplicationCreateDto } from '../../dtos/application/application-create.dto';
import { ApplicationResponseDto } from '../../dtos/application/application-response.dto';
import { ApplicationDomainDtoMapper } from '../../../shared/mappers/application/applicationDomain-dto.mapper';
import { ApplicationQueryDto } from '../../dtos/application/application-query.dto';
import { ApplicationPaginatedResponseDto } from '../../dtos/application/application-paginated.dto';
import { ApplicationStatusUpdateDto } from '../../dtos/application/application-status.dto';

import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import {
  isAdminUser,
  type AuthenticatedUser,
} from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

@ApiTags('applications')
@Controller('applications')
export class ApplicationController {
  constructor(
    private readonly applicationService: ApplicationService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Post()
  @Roles('professional')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear una postulación' })
  @ApiResponse({ status: 201, description: 'Postulación creada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createApplication(
    @Body() dto: ApplicationCreateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationResponseDto> {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    if (
      !isAdminUser(requester) &&
      requester.type !== 'admin' &&
      requester.id !== dto.candidateId
    ) {
      throw new ForbiddenException('Solo puedes postular en tu nombre.');
    }
    const input = ApplicationDtoDomainMapper.toCreateApplicationInput(dto);
    const application = await this.applicationService.createApplication(input);
    return ApplicationDomainDtoMapper.toDto(application);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una postulación por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Postulación encontrada' })
  @ApiResponse({ status: 404, description: 'Postulación no encontrada' })
  async getApplicationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationResponseDto | null> {
    const application = await this.applicationService.getApplicationById(id);
    if (application && !requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    if (application && requester) {
      if (
        requester.type === 'professional' &&
        requester.id === application.candidateId
      )
        return ApplicationDomainDtoMapper.toDto(application);
      if (isAdminUser(requester) || requester.type === 'admin')
        return ApplicationDomainDtoMapper.toDto(application);
      await this.organizationAccess.assertApplicationAccess(
        id,
        requester,
        'read',
      );
    }
    return application ? ApplicationDomainDtoMapper.toDto(application) : null;
  }

  @Get()
  @Roles('organization')
  @ApiOperation({ summary: 'Listar postulaciones con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de postulaciones' })
  async getAllApplications(
    @Query() query: ApplicationQueryDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationPaginatedResponseDto> {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    if (!query.jobId) throw new ForbiddenException('jobId es requerido.');
    if (requester.type !== 'admin' && !isAdminUser(requester)) {
      await this.organizationAccess.assertJobAccess(
        query.jobId,
        requester,
        'read',
      );
    }
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
  @Roles('organization')
  @ApiOperation({ summary: 'Listar postulaciones de una oferta' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de postulaciones' })
  async getApplicationsByJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: ApplicationQueryDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationPaginatedResponseDto> {
    await this.organizationAccess.assertJobAccess(jobId, requester, 'read');
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
  @Roles('professional')
  @ApiOperation({ summary: 'Listar postulaciones de un candidato' })
  @ApiParam({ name: 'candidateId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de postulaciones' })
  async getApplicationsByCandidate(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Query() query: ApplicationQueryDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationPaginatedResponseDto> {
    if (
      !requester ||
      (!isAdminUser(requester) &&
        requester.type !== 'admin' &&
        requester.id !== candidateId)
    ) {
      throw new ForbiddenException('Solo puedes consultar tus postulaciones.');
    }
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

  @Get('organization/:organizationId')
  @Roles('organization')
  @ApiOperation({ summary: 'Listar postulaciones de una organización' })
  @ApiParam({ name: 'organizationId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Lista de postulaciones' })
  async getApplicationsByOrganization(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Query() query: ApplicationQueryDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationPaginatedResponseDto> {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result =
      await this.applicationService.getApplicationsByOrganizationId(
        organizationId,
        pagination,
        query.includeAnswers,
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
  @Roles('organization')
  @ApiOperation({ summary: 'Actualizar estado de una postulación' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Estado actualizado' })
  @ApiResponse({ status: 404, description: 'Postulación no encontrada' })
  async updateApplicationStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ApplicationStatusUpdateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ApplicationResponseDto | null> {
    await this.organizationAccess.assertApplicationAccess(
      id,
      requester,
      'recruit',
    );
    const application = await this.applicationService.updateApplicationStatus(
      id,
      dto.status,
      requester?.id || null,
    );
    return application ? ApplicationDomainDtoMapper.toDto(application) : null;
  }

  @Delete(':id')
  @Roles('professional')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar una postulación' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Postulación eliminada' })
  @ApiResponse({ status: 404, description: 'Postulación no encontrada' })
  async deleteApplication(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const application = await this.applicationService.getApplicationById(id);
    if (!application) return;
    if (
      !isAdminUser(requester) &&
      requester.type !== 'admin' &&
      requester.id !== application.candidateId
    ) {
      throw new ForbiddenException('Solo puedes eliminar tu postulación.');
    }
    await this.applicationService.deleteApplication(id);
  }
}

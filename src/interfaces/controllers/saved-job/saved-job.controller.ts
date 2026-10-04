import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { SavedJobDtoDomainMapper } from '../../../shared/mappers/saved-job/savedJobDto-domain.mapper';
import { SavedJobCreateDto } from '../../dtos/saved-job/saved-job-create.dto';
import { SavedJobResponseDto } from '../../dtos/saved-job/saved-job-response.dto';
import { SavedJobDomainDtoMapper } from '../../../shared/mappers/saved-job/savedJobDomain-dto.mapper';
import { SavedJobPaginatedResponseDto } from '../../dtos/saved-job/saved-job-paginated.dto';
import { Roles } from '../../../shared/decorators/roles.decorator';

import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';

@ApiTags('saved-jobs')
@Roles('professional')
@Controller('saved-jobs')
export class SavedJobController {
  constructor(private readonly savedJobService: SavedJobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Guardar una oferta' })
  @ApiResponse({ status: 201, description: 'Oferta guardada' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async saveJob(
    @Body() dto: SavedJobCreateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedJobResponseDto> {
    await this.assertOwner(dto.userId, requester);
    const input = SavedJobDtoDomainMapper.toCreateSavedJobInput(dto);
    const savedJob = await this.savedJobService.saveJob(input);
    return SavedJobDomainDtoMapper.toDto(savedJob);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Listar ofertas guardadas de un usuario' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de ofertas guardadas' })
  async getSavedJobsByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: { page?: number; limit?: number },
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedJobPaginatedResponseDto> {
    await this.assertOwner(userId, requester);
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.savedJobService.getSavedJobsByUserId(
      userId,
      pagination,
    );

    return {
      data: result.data.map(savedJob =>
        SavedJobDomainDtoMapper.toDto(savedJob),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('job/:jobId')
  @Roles('admin')
  @ApiOperation({ summary: 'Listar guardados de una oferta' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Lista de guardados' })
  async getSavedJobsByJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: { page?: number; limit?: number },
  ): Promise<SavedJobPaginatedResponseDto> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.savedJobService.getSavedJobsByJobId(
      jobId,
      pagination,
    );

    return {
      data: result.data.map(savedJob =>
        SavedJobDomainDtoMapper.toDto(savedJob),
      ),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('check/:userId/:jobId')
  @ApiOperation({ summary: 'Verificar si una oferta está guardada' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Estado de guardado' })
  async checkIfJobIsSaved(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<{ isSaved: boolean }> {
    await this.assertOwner(userId, requester);
    const isSaved = await this.savedJobService.checkIfJobIsSaved(userId, jobId);
    return { isSaved };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener un guardado por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Guardado encontrado' })
  @ApiResponse({ status: 404, description: 'Guardado no encontrado' })
  async getSavedJobById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedJobResponseDto> {
    const savedJob = await this.savedJobService.getSavedJobById(id);
    if (!savedJob)
      return Promise.reject(new NotFoundException('Saved job not found'));
    await this.assertOwner(savedJob.userId, requester);
    return SavedJobDomainDtoMapper.toDto(savedJob);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar un guardado' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Guardado eliminado' })
  @ApiResponse({ status: 404, description: 'Guardado no encontrado' })
  async deleteSavedJob(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    const savedJob = await this.savedJobService.getSavedJobById(id);
    if (!savedJob)
      return Promise.reject(new NotFoundException('Saved job not found'));
    await this.assertOwner(savedJob.userId, requester);
    await this.savedJobService.deleteSavedJob(id);
  }

  @Delete('user/:userId/job/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Quitar una oferta de guardados' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'jobId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Oferta quitada de guardados' })
  async unsaveJob(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.assertOwner(userId, requester);
    await this.savedJobService.unsaveJob(userId, jobId);
  }
  private assertOwner(
    userId: string,
    requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester || requester.id !== userId) {
      return Promise.reject(
        new ForbiddenException('Solo puedes acceder a tus ofertas guardadas.'),
      );
    }
    return Promise.resolve();
  }
}

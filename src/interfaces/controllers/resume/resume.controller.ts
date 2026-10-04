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
  NotFoundException,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { ResumeService } from '../../../core/services/resume.service';
import { ResumeDtoDomainMapper } from '../../../shared/mappers/resume/resumeDto-domain.mapper';
import { ResumeCreateDto } from '../../dtos/resume/resume-create.dto';
import { ResumeUpdateDto } from '../../dtos/resume/resume-update.dto';
import { ResumeResponseDto } from '../../dtos/resume/resume-response.dto';
import { ResumeDomainDtoMapper } from '../../../shared/mappers/resume/resumeDomain-dto.mapper';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { isAdminUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  PaginatedResponse,
  parsePagination,
} from '../../../shared/pagination/pagination';

@ApiTags('resume')
@Controller('resumes')
export class ResumeController {
  constructor(
    private readonly resumeService: ResumeService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Post()
  @Roles('professional')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear currículum' })
  @ApiResponse({ status: 201, description: 'Currículum creado' })
  @ApiResponse({ status: 400, description: 'Datos inválidos' })
  async createResume(
    @Body() dto: ResumeCreateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ResumeResponseDto> {
    if (!requester || requester.id !== dto.userId)
      throw new ForbiddenException('Solo puedes crear tu currículum.');
    const input = ResumeDtoDomainMapper.toCreateResumeInput(dto);
    const resume = await this.resumeService.createResume(input);
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener currículum por ID' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Currículum encontrado' })
  @ApiResponse({ status: 404, description: 'Currículum no encontrado' })
  async getResumeById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.getResumeById(id);
    if (!resume) throw new NotFoundException('Resume not found');
    await this.organizationAccess.assertResumeAccess(id, requester, 'read');
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Obtener currículum de un usuario' })
  @ApiParam({ name: 'userId', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Currículum encontrado' })
  @ApiResponse({ status: 404, description: 'Currículum no encontrado' })
  async getResumeByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ResumeResponseDto> {
    const resume = await this.resumeService.getResumeByUserId(userId);
    if (!resume) throw new NotFoundException('Resume not found');
    await this.organizationAccess.assertResumeAccess(
      resume.id,
      requester,
      'read',
    );
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Get()
  @ApiOperation({ summary: 'Listar currículums con paginación' })
  @ApiResponse({ status: 200, description: 'Lista de currículums' })
  async getAllResumes(
    @Query() query: Record<string, string>,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PaginatedResponse<ResumeResponseDto>> {
    if (!requester || (requester.type !== 'admin' && !isAdminUser(requester))) {
      throw new ForbiddenException('Solo admin puede listar currículums.');
    }
    const result = await this.resumeService.getAllResumes(
      parsePagination(query),
    );
    return {
      ...result,
      data: result.data.map(resume => ResumeDomainDtoMapper.toDto(resume)),
    };
  }

  @Put(':id')
  @Roles('professional')
  @ApiOperation({ summary: 'Actualizar currículum' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Currículum actualizado' })
  @ApiResponse({ status: 404, description: 'Currículum no encontrado' })
  async updateResume(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResumeUpdateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<ResumeResponseDto> {
    await this.organizationAccess.assertResumeAccess(id, requester, 'manage');
    const input = ResumeDtoDomainMapper.toCreateResumeInput(
      dto as ResumeCreateDto,
    );
    const resume = await this.resumeService.updateResume(id, input);
    if (!resume) throw new NotFoundException('Resume not found');
    return ResumeDomainDtoMapper.toDto(resume);
  }

  @Delete(':id')
  @Roles('professional')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar currículum' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 204, description: 'Currículum eliminado' })
  @ApiResponse({ status: 404, description: 'Currículum no encontrado' })
  async deleteResume(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.organizationAccess.assertResumeAccess(id, requester, 'manage');
    await this.resumeService.deleteResume(id);
  }
}

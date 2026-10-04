import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PipelineStageService } from '../../../core/services/pipeline-stage.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { PipelineStageDtoDomainMapper } from '../../../shared/mappers/pipeline-stage/pipelineStageDto-domain.mapper';
import { CreatePipelineStageDto } from '../../dtos/pipeline-stage/create-pipeline-stage.dto';
import { UpdatePipelineStageDto } from '../../dtos/pipeline-stage/update-pipeline-stage.dto';
import { ReorderPipelineStagesDto } from '../../dtos/pipeline-stage/reorder-pipeline-stages.dto';
import { PipelineStageResponseDto } from '../../dtos/pipeline-stage/pipeline-stage-response.dto';
import { PipelineStageDomainDtoMapper } from '../../../shared/mappers/pipeline-stage/pipelineStageDomain-dto.mapper';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

@ApiTags('pipeline-stages')
@Roles('organization')
@Controller('pipeline-stages')
export class PipelineStageController {
  constructor(
    private readonly service: PipelineStageService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreatePipelineStageDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PipelineStageResponseDto> {
    await this.organizationAccess.assertJobAccess(
      dto.jobId,
      requester,
      'manage',
    );
    const input = PipelineStageDtoDomainMapper.toCreateInput(dto);
    const stage = await this.service.create(input);
    return PipelineStageDomainDtoMapper.toDto(stage);
  }

  @Get('job/:jobId')
  async getByJobId(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PipelineStageResponseDto[]> {
    await this.organizationAccess.assertJobAccess(jobId, requester, 'read');
    const stages = await this.service.getByJobId(jobId);
    return stages.map(stage => PipelineStageDomainDtoMapper.toDto(stage));
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PipelineStageResponseDto> {
    await this.organizationAccess.assertPipelineStageAccess(
      id,
      requester,
      'read',
    );
    const stage = await this.service.getById(id);
    if (!stage) throw new NotFoundException('Pipeline stage not found');
    return PipelineStageDomainDtoMapper.toDto(stage);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePipelineStageDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PipelineStageResponseDto> {
    await this.organizationAccess.assertPipelineStageAccess(
      id,
      requester,
      'manage',
    );
    const input = PipelineStageDtoDomainMapper.toUpdateInput(dto);
    const stage = await this.service.update(id, input);
    if (!stage) throw new NotFoundException('Pipeline stage not found');
    return PipelineStageDomainDtoMapper.toDto(stage);
  }

  @Patch('reorder/:jobId')
  @HttpCode(HttpStatus.OK)
  async reorder(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: ReorderPipelineStagesDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PipelineStageResponseDto[]> {
    await this.organizationAccess.assertJobAccess(jobId, requester, 'manage');
    const stages = await this.service.reorder(jobId, dto.stageIds);
    return stages.map(stage => PipelineStageDomainDtoMapper.toDto(stage));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.organizationAccess.assertPipelineStageAccess(
      id,
      requester,
      'manage',
    );
    await this.service.delete(id);
  }
}

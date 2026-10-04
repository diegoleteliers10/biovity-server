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
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiParam } from '@nestjs/swagger';
import { CandidateTagService } from '../../../core/services/candidate-tag.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

class CreateTagDto {
  organizationId: string;
  name: string;
  color?: string;
}

class AssignTagDto {
  candidateId: string;
}

@ApiTags('candidate-tags')
@Roles('organization')
@Controller('candidate-tags')
export class CandidateTagController {
  constructor(
    private readonly service: CandidateTagService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Obtener etiquetas de la organización' })
  @ApiQuery({ name: 'organizationId', type: String })
  async findAll(
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    return this.service.findByOrganization(organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear etiqueta para la organización' })
  async create(
    @Body() dto: CreateTagDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!dto.organizationId || !dto.name) {
      throw new BadRequestException('organizationId y name son requeridos');
    }
    await this.organizationAccess.assertAccess(
      dto.organizationId,
      requester,
      'recruit',
    );
    return this.service.create(dto.organizationId, dto.name, dto.color);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar etiqueta' })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('id', ParseUUIDPipe) tagId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertCandidateTagAccess(
      tagId,
      requester,
      'recruit',
    );
    await this.service.delete(tagId);
  }

  @Post(':id/assign')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Asignar etiqueta a candidato' })
  @ApiParam({ name: 'id', type: String })
  async assign(
    @Param('id', ParseUUIDPipe) tagId: string,
    @Body() dto: AssignTagDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!dto.candidateId) {
      throw new BadRequestException('candidateId es requerido');
    }
    await this.organizationAccess.assertCandidateTagAccess(
      tagId,
      requester,
      'recruit',
    );
    return this.service.assign(tagId, dto.candidateId);
  }

  @Delete(':id/assign')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Desasignar etiqueta de candidato' })
  @ApiParam({ name: 'id', type: String })
  @ApiQuery({ name: 'candidateId', type: String })
  async unassign(
    @Param('id', ParseUUIDPipe) tagId: string,
    @Query('candidateId', ParseUUIDPipe) candidateId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertCandidateTagAccess(
      tagId,
      requester,
      'recruit',
    );
    await this.service.unassign(tagId, candidateId);
  }

  @Get('candidate/:candidateId')
  @ApiOperation({ summary: 'Obtener etiquetas asignadas a un candidato' })
  @ApiParam({ name: 'candidateId', type: String })
  @ApiQuery({ name: 'organizationId', type: String })
  async findByCandidate(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @Query('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    return this.service.findByCandidate(candidateId, organizationId);
  }
}

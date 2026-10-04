import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SavedCandidateService } from '../../../core/services/saved-candidate.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  PaginatedResponse,
  parsePagination,
} from '../../../shared/pagination/pagination';

class SaveCandidateDto {
  organizationId: string;
  candidateId: string;
  note?: string;
}

@ApiTags('saved-candidates')
@Roles('organization')
@Controller('saved-candidates')
export class SavedCandidateController {
  constructor(
    private readonly service: SavedCandidateService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar candidatos guardados por organización' })
  @ApiQuery({ name: 'organizationId', type: String })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  async findAll(
    @Query('organizationId') organizationId: string,
    @Query() query: Record<string, string>,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PaginatedResponse<unknown>> {
    if (!organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    return this.service.findByOrganization(
      organizationId,
      parsePagination(query),
    );
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Guardar candidato en favoritos' })
  async create(
    @Body() dto: SaveCandidateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!dto.organizationId || !dto.candidateId) {
      throw new BadRequestException(
        'organizationId y candidateId son requeridos',
      );
    }
    await this.organizationAccess.assertAccess(
      dto.organizationId,
      requester,
      'manage',
    );
    return this.service.save(dto.organizationId, dto.candidateId, dto.note);
  }

  @Delete()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar candidato de favoritos' })
  @ApiQuery({ name: 'organizationId', type: String })
  @ApiQuery({ name: 'candidateId', type: String })
  async remove(
    @Query('organizationId') organizationId: string,
    @Query('candidateId') candidateId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!organizationId || !candidateId) {
      throw new BadRequestException(
        'organizationId y candidateId son requeridos',
      );
    }
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'manage',
    );
    await this.service.unsave(organizationId, candidateId);
  }

  @Get('check')
  @ApiOperation({ summary: 'Verificar si el candidato ya está guardado' })
  @ApiQuery({ name: 'organizationId', type: String })
  @ApiQuery({ name: 'candidateId', type: String })
  async check(
    @Query('organizationId') organizationId: string,
    @Query('candidateId') candidateId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    if (!organizationId || !candidateId) {
      throw new BadRequestException(
        'organizationId y candidateId son requeridos',
      );
    }
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    const saved = await this.service.isSaved(organizationId, candidateId);
    return { saved };
  }
}

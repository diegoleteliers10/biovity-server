import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationCreateDto } from '../../dtos/organization/organization-create.dto';
import { OrganizationUpdateDto } from '../../dtos/organization/organization-update.dto';
import { OrganizationResponseDto } from '../../dtos/organization/organization-response.dto';
import { TransferOwnershipDto } from '../../dtos/organization/transfer-ownership.dto';
import { OrganizationDomainDtoMapper } from '../../../shared/mappers/organization/organizationDomain-dto.mapper';
import {
  CreateOrganizationInput,
  UpdateOrganizationInput,
} from '../../../core/use-cases/organization/organization.use-case';
import {
  PaginatedResponse,
  parsePagination,
} from '../../../shared/pagination/pagination';
import { Query } from '@nestjs/common';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { isAdminUser } from '../../../shared/auth/better-auth-session.service';

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(
    private readonly organizationService: OrganizationService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  // No @Roles: the caller is the org-typed user that still has no
  // organization (resolveUserRole → 'none') and needs this to onboard.
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @Body() dto: OrganizationCreateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<OrganizationResponseDto> {
    if (
      !requester ||
      requester.type !== 'organization' ||
      requester.organizationId
    ) {
      throw new ForbiddenException(
        'Solo una cuenta de organización sin organización puede crearla.',
      );
    }
    const input: CreateOrganizationInput = {
      name: dto.name,
      website: dto.website,
      phone: dto.phone,
      address: dto.address as Record<string, unknown> | undefined,
    };
    const organization = await this.organizationService.createOrganization(
      input,
      requester.id,
    );
    return OrganizationDomainDtoMapper.toDto(organization);
  }

  @Get(':id')
  async getOrganizationById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<OrganizationResponseDto> {
    await this.organizationAccess.assertAccess(id, requester, 'read');
    const organization = await this.organizationService.getOrganizationById(id);
    if (!organization) throw new NotFoundException('Organization not found');
    return OrganizationDomainDtoMapper.toDto(organization);
  }

  @Get()
  async getAllOrganizations(
    @Query() query: Record<string, string>,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<PaginatedResponse<OrganizationResponseDto>> {
    if (!requester || (requester.type !== 'admin' && !isAdminUser(requester))) {
      throw new ForbiddenException('Solo admin puede listar organizaciones.');
    }
    const result = await this.organizationService.getAllOrganizations(
      parsePagination(query),
    );
    return {
      ...result,
      data: result.data.map(org => OrganizationDomainDtoMapper.toDto(org)),
    };
  }

  @Put(':id')
  @Roles('organization')
  async updateOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrganizationUpdateDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<OrganizationResponseDto> {
    await this.organizationAccess.assertAccess(id, requester, 'manage');
    const input: UpdateOrganizationInput = {
      name: dto.name,
      website: dto.website,
      phone: dto.phone,
      address: dto.address as Record<string, unknown> | undefined,
      integrations: dto.integrations,
      logo: dto.logo,
      description: dto.description,
      industry: dto.industry,
      size: dto.size,
    };
    const organization = await this.organizationService.updateOrganization(
      id,
      input,
    );
    if (!organization) throw new NotFoundException('Organization not found');
    return OrganizationDomainDtoMapper.toDto(organization);
  }

  @Delete(':id')
  @Roles('organization')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.organizationAccess.assertAccess(id, requester, 'manage');
    await this.organizationService.deleteOrganization(id);
  }

  @Post(':id/transfer')
  @Roles('organization')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transferir ownership de la organización a otro miembro',
  })
  async transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<OrganizationResponseDto> {
    await this.organizationAccess.assertOrganizationOwner(id, requester);
    if (!dto.newOwnerUserId) {
      throw new BadRequestException('newOwnerUserId is required');
    }
    if (!requester)
      throw new ForbiddenException('Se requiere una sesión de usuario.');
    const organization = await this.organizationService.transferOwnership(
      id,
      requester.id,
      dto.newOwnerUserId,
    );
    return OrganizationDomainDtoMapper.toDto(organization);
  }
}

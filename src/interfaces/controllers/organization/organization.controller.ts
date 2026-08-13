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
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
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

@ApiTags('organizations')
@Controller('organizations')
export class OrganizationController {
  constructor(private readonly organizationService: OrganizationService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrganization(
    @Body() dto: OrganizationCreateDto,
  ): Promise<OrganizationResponseDto> {
    const input: CreateOrganizationInput = {
      name: dto.name,
      website: dto.website,
      phone: dto.phone,
      address: dto.address as Record<string, unknown> | undefined,
    };
    const organization =
      await this.organizationService.createOrganization(input);
    return OrganizationDomainDtoMapper.toDto(organization);
  }

  @Get(':id')
  async getOrganizationById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<OrganizationResponseDto> {
    const organization = await this.organizationService.getOrganizationById(id);
    if (!organization) throw new NotFoundException('Organization not found');
    return OrganizationDomainDtoMapper.toDto(organization);
  }

  @Get()
  async getAllOrganizations(): Promise<OrganizationResponseDto[]> {
    const organizations = await this.organizationService.getAllOrganizations();
    return organizations.map(org => OrganizationDomainDtoMapper.toDto(org));
  }

  @Put(':id')
  async updateOrganization(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OrganizationUpdateDto,
  ): Promise<OrganizationResponseDto> {
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
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.organizationService.deleteOrganization(id);
  }

  @Post(':id/transfer')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Transferir ownership de la organización a otro miembro',
  })
  async transferOwnership(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TransferOwnershipDto,
  ): Promise<OrganizationResponseDto> {
    if (!dto.newOwnerUserId) {
      throw new BadRequestException('newOwnerUserId is required');
    }
    const organization = await this.organizationService.transferOwnership(
      id,
      dto.newOwnerUserId,
    );
    return OrganizationDomainDtoMapper.toDto(organization);
  }
}

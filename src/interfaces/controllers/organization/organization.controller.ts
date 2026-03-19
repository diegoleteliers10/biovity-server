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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { OrganizationService } from '../../../core/services/organization.service';
import { OrganizationCreateDto } from '../../dtos/organization/organization-create.dto';
import { OrganizationUpdateDto } from '../../dtos/organization/organization-update.dto';
import { OrganizationResponseDto } from '../../dtos/organization/organization-response.dto';
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
  ): Promise<OrganizationResponseDto | null> {
    const organization = await this.organizationService.getOrganizationById(id);
    return organization
      ? OrganizationDomainDtoMapper.toDto(organization)
      : null;
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
  ): Promise<OrganizationResponseDto | null> {
    const input: UpdateOrganizationInput = {
      name: dto.name,
      website: dto.website,
      phone: dto.phone,
      address: dto.address as Record<string, unknown> | undefined,
    };
    const organization = await this.organizationService.updateOrganization(
      id,
      input,
    );
    return organization
      ? OrganizationDomainDtoMapper.toDto(organization)
      : null;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteOrganization(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.organizationService.deleteOrganization(id);
  }
}

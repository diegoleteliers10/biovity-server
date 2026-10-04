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
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { SavedSearchService } from '../../../core/services/saved-search.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SavedSearchDtoDomainMapper } from '../../../shared/mappers/saved-search/savedSearchDto-domain.mapper';
import { CreateSavedSearchDto } from '../../dtos/saved-search/create-saved-search.dto';
import { UpdateSavedSearchDto } from '../../dtos/saved-search/update-saved-search.dto';
import { SavedSearchResponseDto } from '../../dtos/saved-search/saved-search-response.dto';
import { SavedSearchDomainDtoMapper } from '../../../shared/mappers/saved-search/savedSearchDomain-dto.mapper';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

@ApiTags('saved-searches')
@Roles('organization')
@Controller('saved-searches')
export class SavedSearchController {
  constructor(
    private readonly service: SavedSearchService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateSavedSearchDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedSearchResponseDto> {
    await this.organizationAccess.assertAccess(
      dto.organizationId,
      requester,
      'manage',
    );
    const input = SavedSearchDtoDomainMapper.toCreateInput(dto);
    const savedSearch = await this.service.create(input);
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Get('organization/:organizationId')
  async getByOrganizationId(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedSearchResponseDto[]> {
    await this.organizationAccess.assertAccess(
      organizationId,
      requester,
      'read',
    );
    const searches = await this.service.getByOrganizationId(organizationId);
    return searches.map(s => SavedSearchDomainDtoMapper.toDto(s));
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedSearchResponseDto> {
    await this.organizationAccess.assertSavedSearchAccess(
      id,
      requester,
      'read',
    );
    const savedSearch = await this.service.getById(id);
    if (!savedSearch) throw new NotFoundException('Saved search not found');
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Get(':id/execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedSearchResponseDto> {
    await this.organizationAccess.assertSavedSearchAccess(
      id,
      requester,
      'manage',
    );
    const savedSearch = await this.service.execute(id);
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedSearchDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<SavedSearchResponseDto> {
    await this.organizationAccess.assertSavedSearchAccess(
      id,
      requester,
      'manage',
    );
    const input = SavedSearchDtoDomainMapper.toUpdateInput(dto);
    const savedSearch = await this.service.update(id, input);
    if (!savedSearch) throw new NotFoundException('Saved search not found');
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.organizationAccess.assertSavedSearchAccess(
      id,
      requester,
      'manage',
    );
    await this.service.delete(id);
  }
}

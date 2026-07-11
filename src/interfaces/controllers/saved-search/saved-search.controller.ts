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
import { SavedSearchDtoDomainMapper } from '../../../shared/mappers/saved-search/savedSearchDto-domain.mapper';
import { CreateSavedSearchDto } from '../../dtos/saved-search/create-saved-search.dto';
import { UpdateSavedSearchDto } from '../../dtos/saved-search/update-saved-search.dto';
import { SavedSearchResponseDto } from '../../dtos/saved-search/saved-search-response.dto';
import { SavedSearchDomainDtoMapper } from '../../../shared/mappers/saved-search/savedSearchDomain-dto.mapper';

@ApiTags('saved-searches')
@Controller('saved-searches')
export class SavedSearchController {
  constructor(private readonly service: SavedSearchService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() dto: CreateSavedSearchDto): Promise<SavedSearchResponseDto> {
    const input = SavedSearchDtoDomainMapper.toCreateInput(dto);
    const savedSearch = await this.service.create(input);
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Get('organization/:organizationId')
  async getByOrganizationId(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
  ): Promise<SavedSearchResponseDto[]> {
    const searches = await this.service.getByOrganizationId(organizationId);
    return searches.map(s => SavedSearchDomainDtoMapper.toDto(s));
  }

  @Get(':id')
  async getById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SavedSearchResponseDto> {
    const savedSearch = await this.service.getById(id);
    if (!savedSearch) throw new NotFoundException('Saved search not found');
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Get(':id/execute')
  @HttpCode(HttpStatus.OK)
  async execute(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SavedSearchResponseDto> {
    const savedSearch = await this.service.execute(id);
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Put(':id')
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateSavedSearchDto,
  ): Promise<SavedSearchResponseDto> {
    const input = SavedSearchDtoDomainMapper.toUpdateInput(dto);
    const savedSearch = await this.service.update(id, input);
    if (!savedSearch) throw new NotFoundException('Saved search not found');
    return SavedSearchDomainDtoMapper.toDto(savedSearch);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.service.delete(id);
  }
}

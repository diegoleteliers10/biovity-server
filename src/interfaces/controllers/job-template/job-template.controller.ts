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
  NotFoundException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import {
  JobTemplateService,
  type CreateJobTemplateInput,
  type UpdateJobTemplateInput,
} from '../../../core/services/job-template.service';

class CreateJobTemplateDto {
  organizationId: string;
  name: string;
  title: string;
  description: string;
  employmentType?: string;
  experienceLevel?: string;
  salary?: Record<string, unknown>;
  location?: Record<string, unknown>;
  benefits?: Array<{ tipo: string; title: string }>;
  requiredSkills?: string[];
  minExperience?: number;
  category?: string;
}

class UpdateJobTemplateDto {
  name?: string;
  title?: string;
  description?: string;
  employmentType?: string;
  experienceLevel?: string;
  salary?: Record<string, unknown>;
  location?: Record<string, unknown>;
  benefits?: Array<{ tipo: string; title: string }>;
  requiredSkills?: string[];
  minExperience?: number;
  category?: string;
}

@ApiTags('job-templates')
@Controller('organizations/:organizationId/job-templates')
export class JobTemplateController {
  constructor(private readonly service: JobTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Listar plantillas de la organización' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiResponse({ status: 200, description: 'Lista de plantillas' })
  async findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.service.findByOrganization(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener plantilla por ID' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiParam({ name: 'id', type: String })
  async findOne(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const template = await this.service.findById(id, organizationId);
    if (!template) throw new NotFoundException('Plantilla no encontrada');
    return template;
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear plantilla de oferta' })
  @ApiParam({ name: 'organizationId', type: String })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateJobTemplateDto,
  ) {
    const input: CreateJobTemplateInput = { ...dto, organizationId };
    return this.service.create(input);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plantilla de oferta' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateJobTemplateDto,
  ) {
    const input: UpdateJobTemplateInput = dto;
    const updated = await this.service.update(id, organizationId, input);
    if (!updated) throw new NotFoundException('Plantilla no encontrada');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar plantilla de oferta' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiParam({ name: 'id', type: String })
  async remove(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const deleted = await this.service.delete(id, organizationId);
    if (!deleted) throw new NotFoundException('Plantilla no encontrada');
  }
}

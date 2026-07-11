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
import { MessageTemplateService } from '../../../core/services/message-template.service';

class CreateMessageTemplateDto {
  title: string;
  content: string;
}

class UpdateMessageTemplateDto {
  title?: string;
  content?: string;
}

@ApiTags('message-templates')
@Controller('organizations/:organizationId/message-templates')
export class MessageTemplateController {
  constructor(private readonly service: MessageTemplateService) {}

  @Get()
  @ApiOperation({ summary: 'Listar plantillas de mensajes de la organización' })
  @ApiParam({ name: 'organizationId', type: String })
  async findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.service.findByOrganization(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener una plantilla de mensajes' })
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
  @ApiOperation({ summary: 'Crear plantilla de mensajes' })
  @ApiParam({ name: 'organizationId', type: String })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: CreateMessageTemplateDto,
  ) {
    return this.service.create({
      organizationId,
      title: dto.title,
      content: dto.content,
    });
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar plantilla de mensajes' })
  @ApiParam({ name: 'organizationId', type: String })
  @ApiParam({ name: 'id', type: String })
  async update(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMessageTemplateDto,
  ) {
    const updated = await this.service.update(id, organizationId, dto);
    if (!updated) throw new NotFoundException('Plantilla no encontrada');
    return updated;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar plantilla de mensajes' })
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

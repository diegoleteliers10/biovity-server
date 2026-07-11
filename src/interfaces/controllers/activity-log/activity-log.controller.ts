import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { ActivityLogService } from '../../../core/services/activity-log.service';

@ApiTags('activity-logs')
@Controller('organizations/:organizationId/activity-logs')
export class ActivityLogController {
  constructor(private readonly service: ActivityLogService) {}

  @Get()
  @ApiOperation({ summary: 'Obtener historial de actividades de la organización' })
  @ApiParam({ name: 'organizationId', type: String })
  async findAll(@Param('organizationId', ParseUUIDPipe) organizationId: string) {
    return this.service.findByOrganization(organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Registrar una actividad de auditoría' })
  @ApiParam({ name: 'organizationId', type: String })
  async create(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Body() dto: { userId: string; action: string; description: string; metadata?: Record<string, any> }
  ) {
    if (!dto.userId || !dto.action || !dto.description) {
      throw new BadRequestException('userId, action y description son requeridos');
    }
    return this.service.log({
      organizationId,
      userId: dto.userId,
      action: dto.action,
      description: dto.description,
      metadata: dto.metadata,
    });
  }
}

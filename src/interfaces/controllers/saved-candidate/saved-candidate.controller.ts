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

class SaveCandidateDto {
  organizationId: string;
  candidateId: string;
  note?: string;
}

@ApiTags('saved-candidates')
@Controller('saved-candidates')
export class SavedCandidateController {
  constructor(private readonly service: SavedCandidateService) {}

  @Get()
  @ApiOperation({ summary: 'Listar candidatos guardados por organización' })
  @ApiQuery({ name: 'organizationId', type: String })
  async findAll(@Query('organizationId') organizationId: string) {
    if (!organizationId) {
      throw new BadRequestException('organizationId es requerido');
    }
    return this.service.findByOrganization(organizationId);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Guardar candidato en favoritos' })
  async create(@Body() dto: SaveCandidateDto) {
    if (!dto.organizationId || !dto.candidateId) {
      throw new BadRequestException(
        'organizationId y candidateId son requeridos',
      );
    }
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
  ) {
    if (!organizationId || !candidateId) {
      throw new BadRequestException(
        'organizationId y candidateId son requeridos',
      );
    }
    await this.service.unsave(organizationId, candidateId);
  }

  @Get('check')
  @ApiOperation({ summary: 'Verificar si el candidato ya está guardado' })
  @ApiQuery({ name: 'organizationId', type: String })
  @ApiQuery({ name: 'candidateId', type: String })
  async check(
    @Query('organizationId') organizationId: string,
    @Query('candidateId') candidateId: string,
  ) {
    if (!organizationId || !candidateId) {
      throw new BadRequestException(
        'organizationId y candidateId son requeridos',
      );
    }
    const saved = await this.service.isSaved(organizationId, candidateId);
    return { saved };
  }
}

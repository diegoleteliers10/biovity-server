import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ResumeCvLifecycleService } from '../../../core/services/resume-cv-lifecycle.service';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';
import { Public } from '../../../shared/decorators/public.decorator';
import {
  ClaimCvCleanupDto,
  FailCvCleanupDto,
  FinishCvCleanupDto,
} from '../../dtos/resume/resume-cv-lifecycle.dto';

@ApiTags('admin-cv-cleanup')
@Public()
@UseGuards(InternalSecretGuard)
@Controller('admin/cv-cleanup')
export class AdminCvCleanupController {
  constructor(private readonly cvLifecycle: ResumeCvLifecycleService) {}

  @Post('claim')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reclamar tareas para limpiar archivos CV' })
  async claim(@Body() dto: ClaimCvCleanupDto) {
    return { items: await this.cvLifecycle.claim(dto.limit) };
  }

  @Post(':id/finish')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Confirmar la limpieza de un archivo CV' })
  async finish(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FinishCvCleanupDto,
  ) {
    return { status: await this.cvLifecycle.finish(id, dto.leaseToken) };
  }

  @Post(':id/fail')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Registrar un error de limpieza de un archivo CV' })
  async fail(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FailCvCleanupDto,
  ) {
    return {
      status: await this.cvLifecycle.fail(id, dto.leaseToken, dto.error),
    };
  }
}

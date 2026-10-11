import { Controller, Get, HttpCode, HttpStatus, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminOperationsQueueService } from '../../../core/services/admin-operations-queue.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { OperationsQueueQueryDto } from '../../dtos/admin/operations-queue.dto';

@ApiTags('admin-operations-queue')
@Roles('admin')
@Controller('admin/operations-queue')
export class AdminOperationsQueueController {
  constructor(private readonly queue: AdminOperationsQueueService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Listar alertas operativos de empleo y selección' })
  list(@Query() query: OperationsQueueQueryDto) {
    return this.queue.list(query);
  }
}

import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JobAlertService } from '../../../core/services/job-alert.service';
import { JobAlertDtoDomainMapper } from '../../../shared/mappers/job-alert/jobAlertDto-domain.mapper';
import { CreateJobAlertDto } from '../../dtos/job-alert/create-job-alert.dto';
import { JobAlertResponseDto } from '../../dtos/job-alert/job-alert-response.dto';
import { JobAlertDomainDtoMapper } from '../../../shared/mappers/job-alert/jobAlertDomain-dto.mapper';
import { Roles } from '../../../shared/decorators/roles.decorator';

import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';

@ApiTags('job-alerts')
@Roles('professional')
@Controller('job-alerts')
export class JobAlertController {
  constructor(private readonly service: JobAlertService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateJobAlertDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<JobAlertResponseDto> {
    await this.assertOwner(dto.userId, requester);
    const input = JobAlertDtoDomainMapper.toCreateInput(dto);
    const jobAlert = await this.service.create(input);
    return JobAlertDomainDtoMapper.toDto(jobAlert);
  }

  @Get()
  async getByUserId(
    @Query('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<JobAlertResponseDto[]> {
    await this.assertOwner(userId, requester);
    const alerts = await this.service.getByUserId(userId);
    return alerts.map(alert => JobAlertDomainDtoMapper.toDto(alert));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('userId', ParseUUIDPipe) userId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    await this.assertOwner(userId, requester);
    await this.service.delete(id, userId);
  }
  private assertOwner(
    userId: string,
    requester: AuthenticatedUser | undefined,
  ): Promise<void> {
    if (!requester || requester.id !== userId) {
      return Promise.reject(
        new ForbiddenException('Solo puedes acceder a tus alertas.'),
      );
    }
    return Promise.resolve();
  }
}

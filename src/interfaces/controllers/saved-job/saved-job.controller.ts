import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { SavedJobService } from '../../../core/services/saved-job.service';
import { SavedJobDtoDomainMapper } from '../../../shared/mappers/saved-job/savedJobDto-domain.mapper';
import { SavedJobCreateDto } from '../../dtos/saved-job/saved-job-create.dto';
import { SavedJobResponseDto } from '../../dtos/saved-job/saved-job-response.dto';
import { SavedJobDomainDtoMapper } from '../../../shared/mappers/saved-job/savedJobDomain-dto.mapper';
import { SavedJobPaginatedResponseDto } from '../../dtos/saved-job/saved-job-paginated.dto';

@Controller('saved-jobs')
export class SavedJobController {
  constructor(private readonly savedJobService: SavedJobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async saveJob(
    @Body() dto: SavedJobCreateDto,
  ): Promise<SavedJobResponseDto> {
    const input = SavedJobDtoDomainMapper.toCreateSavedJobInput(dto);
    const savedJob = await this.savedJobService.saveJob(input);
    return SavedJobDomainDtoMapper.toDto(savedJob);
  }

  @Get('user/:userId')
  async getSavedJobsByUser(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: { page?: number; limit?: number },
  ): Promise<SavedJobPaginatedResponseDto> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.savedJobService.getSavedJobsByUserId(
      userId,
      pagination,
    );

    return {
      data: result.data.map(savedJob => SavedJobDomainDtoMapper.toDto(savedJob)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('job/:jobId')
  async getSavedJobsByJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Query() query: { page?: number; limit?: number },
  ): Promise<SavedJobPaginatedResponseDto> {
    const pagination = {
      page: query.page,
      limit: query.limit,
    };

    const result = await this.savedJobService.getSavedJobsByJobId(
      jobId,
      pagination,
    );

    return {
      data: result.data.map(savedJob => SavedJobDomainDtoMapper.toDto(savedJob)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }

  @Get('check/:userId/:jobId')
  async checkIfJobIsSaved(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<{ isSaved: boolean }> {
    const isSaved = await this.savedJobService.checkIfJobIsSaved(userId, jobId);
    return { isSaved };
  }

  @Get(':id')
  async getSavedJobById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<SavedJobResponseDto | null> {
    const savedJob = await this.savedJobService.getSavedJobById(id);
    return savedJob ? SavedJobDomainDtoMapper.toDto(savedJob) : null;
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteSavedJob(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.savedJobService.deleteSavedJob(id);
  }

  @Delete('user/:userId/job/:jobId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async unsaveJob(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<void> {
    await this.savedJobService.unsaveJob(userId, jobId);
  }
}

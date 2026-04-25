import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JobQuestionService } from '../../../core/services/job-question.service';
import { JobQuestionDtoDomainMapper } from '../../../shared/mappers/job-question/jobQuestionDto-domain.mapper';
import { JobQuestionDomainDtoMapper } from '../../../shared/mappers/job-question/jobQuestionDomain-dto.mapper';
import {
  CreateQuestionDto,
  UpdateQuestionDto,
  ReorderQuestionsDto,
} from '../../dtos/job-question/question.dto';
import { QuestionResponseDto } from '../../dtos/job-question/question-response.dto';

@ApiTags('job-questions')
@Controller()
export class JobQuestionController {
  constructor(private readonly jobQuestionService: JobQuestionService) {}

  @Get('jobs/:jobId/questions')
  async getPublishedQuestions(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<QuestionResponseDto[]> {
    const questions = await this.jobQuestionService.getQuestionsByJobId(jobId);
    return JobQuestionDomainDtoMapper.toDtoList(questions);
  }

  @Get('organizations/:organizationId/jobs/:jobId/questions')
  async getAllQuestionsByJob(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<QuestionResponseDto[]> {
    const questions =
      await this.jobQuestionService.getQuestionsByOrganizationId(
        organizationId,
      );
    const filtered = questions.filter(q => q.jobId === jobId);
    return JobQuestionDomainDtoMapper.toDtoList(filtered);
  }

  @Post('organizations/:organizationId/jobs/:jobId/questions')
  @HttpCode(HttpStatus.CREATED)
  async createQuestion(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const input = JobQuestionDtoDomainMapper.toCreateInput(
      dto,
      jobId,
      organizationId,
    );
    const question = await this.jobQuestionService.createQuestion(input);
    return JobQuestionDomainDtoMapper.toDto(question);
  }

  @Put('jobs/questions/:id')
  async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto | null> {
    const input = JobQuestionDtoDomainMapper.toUpdateInput(dto);
    const question = await this.jobQuestionService.updateQuestion(id, input);
    return question ? JobQuestionDomainDtoMapper.toDto(question) : null;
  }

  @Patch('jobs/questions/:id/publish')
  async publishQuestion(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionResponseDto | null> {
    const question = await this.jobQuestionService.publishQuestion(id);
    return question ? JobQuestionDomainDtoMapper.toDto(question) : null;
  }

  @Patch('jobs/questions/:id/unpublish')
  async unpublishQuestion(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionResponseDto | null> {
    const question = await this.jobQuestionService.unpublishQuestion(id);
    return question ? JobQuestionDomainDtoMapper.toDto(question) : null;
  }

  @Patch('organizations/:organizationId/jobs/:jobId/questions/reorder')
  async reorderQuestions(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: ReorderQuestionsDto,
  ): Promise<QuestionResponseDto[]> {
    const items =
      dto.items?.map(item => ({
        id: item.id,
        orderIndex: item.orderIndex,
      })) ?? [];

    await this.jobQuestionService.reorderQuestions(jobId, items);

    const questions =
      await this.jobQuestionService.getQuestionsByOrganizationId(
        organizationId,
      );
    const filtered = questions.filter(q => q.jobId === jobId);
    return JobQuestionDomainDtoMapper.toDtoList(filtered);
  }

  @Delete('jobs/questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteQuestion(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.jobQuestionService.deleteQuestion(id);
  }
}

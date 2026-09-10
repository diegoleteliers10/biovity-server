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
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../../../shared/decorators/public.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
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
@Roles('organization')
@Controller()
export class JobQuestionController {
  constructor(private readonly jobQuestionService: JobQuestionService) {}

  // Canonical routes. Legacy flat routes below delegate to the same
  // private helpers and stay as deprecated aliases.

  @Get('job-questions/job/:jobId/published')
  @Public()
  @ApiOperation({ summary: 'Preguntas publicadas de una oferta' })
  async getPublishedQuestionsCanonical(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<QuestionResponseDto[]> {
    return this.listPublished(jobId);
  }

  @Get('job-questions/job/:jobId')
  @ApiOperation({ summary: 'Todas las preguntas de una oferta' })
  async getAllQuestionsByJobCanonical(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<QuestionResponseDto[]> {
    return this.listByJob(jobId);
  }

  @Post('job-questions/job/:jobId')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Crear pregunta en una oferta' })
  @ApiResponse({ status: 201, description: 'Pregunta creada' })
  @ApiResponse({
    status: 400,
    description: 'Datos inválidos u organizationId ausente',
  })
  async createQuestionCanonical(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    if (!dto.organizationId) {
      throw new BadRequestException('organizationId es requerido en el body');
    }
    return this.createOne(jobId, dto.organizationId, dto);
  }

  @Put('job-questions/:id')
  @ApiOperation({ summary: 'Actualizar pregunta' })
  async updateQuestionCanonical(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    return this.updateOne(id, dto);
  }

  @Patch('job-questions/:id/publish')
  @ApiOperation({ summary: 'Publicar pregunta' })
  async publishQuestionCanonical(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionResponseDto> {
    return this.publishOne(id);
  }

  @Patch('job-questions/:id/unpublish')
  @ApiOperation({ summary: 'Despublicar pregunta' })
  async unpublishQuestionCanonical(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionResponseDto> {
    return this.unpublishOne(id);
  }

  @Patch('job-questions/job/:jobId/reorder')
  @ApiOperation({ summary: 'Reordenar preguntas de una oferta' })
  async reorderQuestionsCanonical(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: ReorderQuestionsDto,
  ): Promise<QuestionResponseDto[]> {
    return this.reorder(jobId, dto);
  }

  @Delete('job-questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Eliminar pregunta' })
  async deleteQuestionCanonical(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.jobQuestionService.deleteQuestion(id);
  }

  // Legacy aliases (deprecated, kept until the frontend migrates).

  @Get('jobs/:jobId/questions')
  @Public()
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa GET /job-questions/job/:jobId/published',
  })
  async getPublishedQuestions(
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<QuestionResponseDto[]> {
    return this.listPublished(jobId);
  }

  @Get('organizations/:organizationId/jobs/:jobId/questions')
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa GET /job-questions/job/:jobId',
  })
  async getAllQuestionsByJob(
    @Param('organizationId', ParseUUIDPipe) _organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
  ): Promise<QuestionResponseDto[]> {
    return this.listByJob(jobId);
  }

  @Post('organizations/:organizationId/jobs/:jobId/questions')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa POST /job-questions/job/:jobId',
  })
  async createQuestion(
    @Param('organizationId', ParseUUIDPipe) organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    return this.createOne(jobId, organizationId, dto);
  }

  @Put('jobs/questions/:id')
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa PUT /job-questions/:id',
  })
  async updateQuestion(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    return this.updateOne(id, dto);
  }

  @Patch('jobs/questions/:id/publish')
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa PATCH /job-questions/:id/publish',
  })
  async publishQuestion(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionResponseDto> {
    return this.publishOne(id);
  }

  @Patch('jobs/questions/:id/unpublish')
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa PATCH /job-questions/:id/unpublish',
  })
  async unpublishQuestion(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<QuestionResponseDto> {
    return this.unpublishOne(id);
  }

  @Patch('organizations/:organizationId/jobs/:jobId/questions/reorder')
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa PATCH /job-questions/job/:jobId/reorder',
  })
  async reorderQuestions(
    @Param('organizationId', ParseUUIDPipe) _organizationId: string,
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @Body() dto: ReorderQuestionsDto,
  ): Promise<QuestionResponseDto[]> {
    return this.reorder(jobId, dto);
  }

  @Delete('jobs/questions/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    deprecated: true,
    summary: 'Deprecado: usa DELETE /job-questions/:id',
  })
  async deleteQuestion(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.jobQuestionService.deleteQuestion(id);
  }

  private async listPublished(jobId: string): Promise<QuestionResponseDto[]> {
    const questions = await this.jobQuestionService.getQuestionsByJobId(jobId);
    return JobQuestionDomainDtoMapper.toDtoList(questions);
  }

  private async listByJob(jobId: string): Promise<QuestionResponseDto[]> {
    const questions =
      await this.jobQuestionService.getAllQuestionsByJobId(jobId);
    return JobQuestionDomainDtoMapper.toDtoList(questions);
  }

  private async createOne(
    jobId: string,
    organizationId: string,
    dto: CreateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const input = JobQuestionDtoDomainMapper.toCreateInput(
      dto,
      jobId,
      organizationId,
    );
    const question = await this.jobQuestionService.createQuestion(input);
    return JobQuestionDomainDtoMapper.toDto(question);
  }

  private async updateOne(
    id: string,
    dto: UpdateQuestionDto,
  ): Promise<QuestionResponseDto> {
    const input = JobQuestionDtoDomainMapper.toUpdateInput(dto);
    const question = await this.jobQuestionService.updateQuestion(id, input);
    if (!question) throw new NotFoundException('Question not found');
    return JobQuestionDomainDtoMapper.toDto(question);
  }

  private async publishOne(id: string): Promise<QuestionResponseDto> {
    const question = await this.jobQuestionService.publishQuestion(id);
    if (!question) throw new NotFoundException('Question not found');
    return JobQuestionDomainDtoMapper.toDto(question);
  }

  private async unpublishOne(id: string): Promise<QuestionResponseDto> {
    const question = await this.jobQuestionService.unpublishQuestion(id);
    if (!question) throw new NotFoundException('Question not found');
    return JobQuestionDomainDtoMapper.toDto(question);
  }

  private async reorder(
    jobId: string,
    dto: ReorderQuestionsDto,
  ): Promise<QuestionResponseDto[]> {
    const items =
      dto.items?.map(item => ({
        id: item.id,
        orderIndex: item.orderIndex,
      })) ?? [];

    await this.jobQuestionService.reorderQuestions(jobId, items);

    return this.listByJob(jobId);
  }
}

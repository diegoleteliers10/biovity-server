import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { isUUID } from 'class-validator';
import { ApiTags } from '@nestjs/swagger';
import { ApplicationHiringRecordService } from '../../../core/services/application-hiring-record.service';
import { ApplicationEvaluationDto } from '../../dtos/application/application-evaluation.dto';
import { ApplicationNoteDto } from '../../dtos/application/application-note.dto';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';

const EVALUATION_CONTEXTS: ReadonlySet<string> = new Set([
  'cv_review',
  'initial_interview',
  'technical_interview',
  'final_review',
]);
const SCORED_SKILLS = ['technical', 'cultural', 'expectations'] as const;

@ApiTags('application-hiring-records')
@Controller()
export class ApplicationHiringRecordController {
  constructor(
    private readonly hiringRecords: ApplicationHiringRecordService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get('evaluations')
  @Roles('organization')
  async getEvaluations(
    @Query('applicationId') applicationId: string | undefined,
    @Query('applicationIds') applicationIds: string | undefined,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const requestedIds = applicationIds?.split(',') ?? (applicationId ? [applicationId] : []);
    const uniqueIds = [...new Set(requestedIds)];
    if (
      (applicationId && applicationIds !== undefined) ||
      uniqueIds.length === 0 ||
      uniqueIds.length > 100 ||
      uniqueIds.some(id => !isUUID(id))
    ) {
      throw new BadRequestException('Indica entre 1 y 100 postulaciones válidas.');
    }
    await Promise.all(
      uniqueIds.map(id =>
        this.organizationAccess.assertApplicationAccess(id, requester, 'recruit'),
      ),
    );
    return this.hiringRecords.getEvaluations(uniqueIds);
  }

  @Post('evaluations')
  @Roles('organization')
  @HttpCode(HttpStatus.OK)
  async saveEvaluation(
    @Body() dto: ApplicationEvaluationDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const skillsAssessment = dto.skillsAssessment ?? {};
    const invalidValues = Object.values(skillsAssessment).some(
      value => typeof value !== 'string',
    );
    const invalidScores = SCORED_SKILLS.some(skill => {
      const score = skillsAssessment[skill];
      return score !== undefined && !/^[0-5]$/.test(score);
    });
    const context = skillsAssessment.context;
    const invalidContext =
      context !== undefined && !EVALUATION_CONTEXTS.has(context);
    const missingRequiredNotes =
      dto.rating !== 'positive' && !dto.notes?.trim();
    if (invalidValues || invalidScores || invalidContext || missingRequiredNotes) {
      throw new BadRequestException('Revisa el puntaje, el contexto y la justificación de la evaluación.');
    }
    await this.organizationAccess.assertApplicationAccess(
      dto.applicationId,
      requester,
      'recruit',
    );
    const saved = await this.hiringRecords.saveEvaluation({
      applicationId: dto.applicationId,
      evaluatorId: requester.id,
      rating: dto.rating,
      notes: dto.notes ?? null,
      skillsAssessment,
    });
    if (!saved) throw new InternalServerErrorException('No se pudo recuperar la evaluación guardada.');
    return saved;
  }

  @Get('notes')
  @Roles('organization')
  async getNotes(
    @Query('applicationId') applicationId: string | undefined,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    if (!applicationId || !isUUID(applicationId)) {
      throw new BadRequestException('Indica una postulación válida.');
    }
    await this.organizationAccess.assertApplicationAccess(
      applicationId,
      requester,
      'recruit',
    );
    return this.hiringRecords.getNotes(applicationId);
  }

  @Post('notes')
  @Roles('organization')
  @HttpCode(HttpStatus.CREATED)
  async addNote(
    @Body() dto: ApplicationNoteDto,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    await this.organizationAccess.assertApplicationAccess(
      dto.applicationId,
      requester,
      'recruit',
    );
    const created = await this.hiringRecords.addNote({
      applicationId: dto.applicationId,
      authorId: requester.id,
      content: dto.content,
      tags: dto.tags ?? [],
    });
    if (!created) throw new InternalServerErrorException('No se pudo recuperar la nota guardada.');
    return created;
  }

  @Delete('notes/:id')
  @Roles('organization')
  @HttpCode(HttpStatus.OK)
  async deleteNote(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() requester: AuthenticatedUser,
  ) {
    const note = await this.hiringRecords.getNoteForDeletion(id);
    if (!note) throw new NotFoundException('Nota no encontrada.');
    await this.organizationAccess.assertApplicationAccess(
      note.applicationId,
      requester,
      'recruit',
    );
    if (note.authorId !== requester.id) {
      throw new NotFoundException('Nota no encontrada.');
    }
    const deleted = await this.hiringRecords.deleteNote(id, requester.id);
    if (!deleted) throw new NotFoundException('Nota no encontrada.');
    return { success: true };
  }
}

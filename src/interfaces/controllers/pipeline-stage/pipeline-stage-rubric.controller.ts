import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Put,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { PipelineStageRubricService } from '../../../core/services/pipeline-stage-rubric.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { SavePipelineStageRubricDto } from '../../dtos/pipeline-stage/pipeline-stage-rubric.dto';

@ApiTags('pipeline-stage-rubrics')
@Roles('organization')
@Controller('pipeline-stages/:id/rubric')
export class PipelineStageRubricController {
  constructor(
    private readonly rubrics: PipelineStageRubricService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  async getRubric(
    @Param('id', ParseUUIDPipe) stageId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertPipelineStageAccess(
      stageId,
      requester,
      'read',
    );
    return this.rubrics.findCurrent(stageId);
  }

  @Put()
  async saveRubric(
    @Param('id', ParseUUIDPipe) stageId: string,
    @Body() dto: SavePipelineStageRubricDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertPipelineStageAccess(
      stageId,
      requester,
      'manage',
    );
    return this.rubrics.createVersion(stageId, dto);
  }
}

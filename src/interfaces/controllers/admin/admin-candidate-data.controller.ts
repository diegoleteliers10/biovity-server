import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CandidateDataLifecycleService } from '../../../core/services/candidate-data-lifecycle.service';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import { Roles } from '../../../shared/decorators/roles.decorator';

@ApiTags('admin-candidate-data')
@Controller('admin/candidate-data')
export class AdminCandidateDataController {
  constructor(private readonly lifecycle: CandidateDataLifecycleService) {}

  @Get(':candidateId/export')
  @Roles('admin')
  @ApiOperation({ summary: 'Exportar datos de un candidato' })
  exportCandidateData(
    @Param('candidateId', ParseUUIDPipe) candidateId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.lifecycle.exportCandidateData(candidateId, actor.id);
  }
}

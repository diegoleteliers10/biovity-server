import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AiCredentialsService } from '../../../core/services/ai-credentials.service';
import { CreateAiCredentialDto } from '../../dtos/ai-credentials/create-ai-credential.dto';
import {
  AiCredentialResponseDto,
  AiCredentialListItemDto,
} from '../../dtos/ai-credentials/ai-credential-response.dto';
import { InternalSecretGuard } from '../../../shared/guards/internal-secret.guard';
import { Roles } from '../../../shared/decorators/roles.decorator';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../../../shared/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../../shared/auth/better-auth-session.service';
import { OrganizationAccessService } from '../../../shared/auth/organization-access.service';
import {
  THROTTLE_SENSITIVE_LIMIT,
  THROTTLE_TTL_MS,
} from '../../../shared/constants/throttling';

@ApiTags('ai-credentials')
@Throttle({
  default: { limit: THROTTLE_SENSITIVE_LIMIT, ttl: THROTTLE_TTL_MS },
})
@Roles('organization')
@Controller('organizations/:orgId/ai-credentials')
export class AiCredentialsController {
  constructor(
    private readonly service: AiCredentialsService,
    private readonly organizationAccess: OrganizationAccessService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Get masked AI credential preview for an organization',
  })
  @ApiResponse({ status: 200, type: AiCredentialResponseDto })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  async getMasked(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(orgId, requester, 'manage');
    return this.service.getMasked(orgId);
  }

  @Get('list')
  @ApiOperation({ summary: 'List all AI credentials for an organization' })
  @ApiResponse({ status: 200, type: AiCredentialListItemDto, isArray: true })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  async list(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(orgId, requester, 'manage');
    return this.service.list(orgId);
  }

  @Post()
  @ApiOperation({ summary: 'Save (upsert) AI credentials for an organization' })
  @ApiResponse({ status: 201, type: AiCredentialResponseDto })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  async save(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateAiCredentialDto,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(orgId, requester, 'manage');
    return this.service.save(orgId, dto);
  }

  @Post(':credId/activate')
  @ApiOperation({
    summary: 'Activate a specific credential (deactivates the current one)',
  })
  @ApiResponse({ status: 200, type: AiCredentialResponseDto })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'credId', type: 'string', format: 'uuid' })
  async activate(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('credId', ParseUUIDPipe) credId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(orgId, requester, 'manage');
    return this.service.activate(orgId, credId);
  }

  @Delete()
  @ApiOperation({
    summary: 'Remove the active AI credential for an organization',
  })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  async remove(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(orgId, requester, 'manage');
    await this.service.remove(orgId);
    return { removed: true };
  }

  @Delete(':credId')
  @ApiOperation({ summary: 'Delete a specific credential by ID' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'credId', type: 'string', format: 'uuid' })
  async removeById(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('credId', ParseUUIDPipe) credId: string,
    @CurrentUser() requester: AuthenticatedUser | undefined,
  ) {
    await this.organizationAccess.assertAccess(orgId, requester, 'manage');
    await this.service.removeById(orgId, credId);
    return { removed: true };
  }

  @Get('active')
  @UseGuards(InternalSecretGuard)
  @ApiOperation({
    summary: 'Get the decrypted active credential (server-to-server only)',
  })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  async getActive(@Param('orgId', ParseUUIDPipe) orgId: string) {
    const credential = await this.service.getActiveDecrypted(orgId);
    if (!credential) {
      throw new NotFoundException('No active AI credential');
    }
    return credential;
  }
}

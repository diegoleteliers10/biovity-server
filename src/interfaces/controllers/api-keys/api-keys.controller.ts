import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ApiKeysService } from '../../../core/services/api-keys.service';
import { CreateApiKeyDto } from '../../dtos/api-keys/create-api-key.dto';
import {
  ApiKeyResponseDto,
  ApiKeyCreateResponseDto,
} from '../../dtos/api-keys/api-key-response.dto';

@ApiTags('api-keys')
@Controller('organizations/:orgId/api-keys')
export class ApiKeysController {
  constructor(private readonly apiKeysService: ApiKeysService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, type: ApiKeyCreateResponseDto })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  async create(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Body() dto: CreateApiKeyDto,
    @Req() req: any,
  ) {
    const userId = req.user?.id || null;
    const { rawKey, record } = await this.apiKeysService.create(
      orgId,
      userId,
      dto,
    );

    return {
      id: record.id,
      name: record.name,
      key: rawKey,
      keyPrefix: record.keyPrefix,
      scopes: record.scopes,
      createdAt: record.createdAt,
    };
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys for an organization' })
  @ApiResponse({ status: 200, type: [ApiKeyResponseDto] })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  async list(@Param('orgId', ParseUUIDPipe) orgId: string) {
    const keys = await this.apiKeysService.listByOrg(orgId);
    return keys.map(({ keyHash: _k, keyPrefix: _p, ...safe }: any) => safe);
  }

  @Delete(':keyId')
  @ApiOperation({ summary: 'Revoke an API key' })
  @ApiResponse({ status: 200 })
  @ApiParam({ name: 'orgId', type: 'string', format: 'uuid' })
  @ApiParam({ name: 'keyId', type: 'string', format: 'uuid' })
  async revoke(
    @Param('orgId', ParseUUIDPipe) orgId: string,
    @Param('keyId', ParseUUIDPipe) keyId: string,
  ) {
    await this.apiKeysService.revoke(keyId, orgId);
    return { revoked: true };
  }
}

import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { randomBytes, createHash } from 'crypto';
import { ApiKeyEntity } from '../../infrastructure/database/orm/api-key.entity';
import { CreateApiKeyDto } from '../../interfaces/dtos/api-keys/create-api-key.dto';

@Injectable()
export class ApiKeysService {
  constructor(
    @InjectRepository(ApiKeyEntity)
    private readonly repo: Repository<ApiKeyEntity>,
  ) {}

  async create(
    organizationId: string,
    userId: string,
    dto: CreateApiKeyDto,
  ): Promise<{ rawKey: string; record: ApiKeyEntity }> {
    const rawKey = `bvty_live_${randomBytes(32).toString('base64url')}`;
    const keyHash = createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.substring(0, 16);

    const record = this.repo.create({
      organizationId,
      createdByUserId: userId,
      name: dto.name,
      scopes: dto.scopes ?? ['mcp:read'],
      keyHash,
      keyPrefix,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
    });

    await this.repo.save(record);
    return { rawKey, record };
  }

  async validate(rawKey: string): Promise<ApiKeyEntity | null> {
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await this.repo.findOne({
      where: { keyHash, revokedAt: IsNull() },
      relations: ['organization'],
    });

    if (!apiKey) return null;
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null;

    this.repo.update(apiKey.id, { lastUsedAt: new Date() });

    return apiKey;
  }

  async listByOrg(organizationId: string): Promise<ApiKeyEntity[]> {
    return this.repo.find({
      where: { organizationId, revokedAt: IsNull() },
      order: { createdAt: 'DESC' },
    });
  }

  async revoke(id: string, organizationId: string): Promise<void> {
    await this.repo.update({ id, organizationId }, { revokedAt: new Date() });
  }
}

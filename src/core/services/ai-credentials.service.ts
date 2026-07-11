import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiCredentialEntity } from '../../infrastructure/database/orm/ai-credential.entity';
import { EncryptionService } from '../../shared/crypto/encryption.service';
import { CreateAiCredentialDto } from '../../interfaces/dtos/ai-credentials/create-ai-credential.dto';

const EMPTY_MASKED = {
  provider: null,
  modelId: null,
  keyPreview: null,
  label: null,
  hasCredential: false,
};

@Injectable()
export class AiCredentialsService {
  constructor(
    @InjectRepository(AiCredentialEntity)
    private readonly repo: Repository<AiCredentialEntity>,
    private readonly crypto: EncryptionService,
  ) {}

  async getMasked(organizationId: string) {
    const active = await this.findActive(organizationId);
    if (!active) return { ...EMPTY_MASKED };
    return {
      provider: active.provider,
      modelId: active.modelId,
      keyPreview: active.keyPreview,
      label: active.label,
      hasCredential: true,
    };
  }

  async list(organizationId: string) {
    const credentials = await this.repo.find({
      where: { organizationId },
      order: { isActive: 'DESC', createdAt: 'DESC' },
    });
    return credentials.map((c) => ({
      id: c.id,
      provider: c.provider,
      modelId: c.modelId,
      keyPreview: c.keyPreview,
      label: c.label,
      isActive: c.isActive,
      createdAt: c.createdAt,
    }));
  }

  async save(organizationId: string, dto: CreateAiCredentialDto) {
    const encrypted = this.crypto.encrypt(dto.apiKey);
    const keyPreview = this.buildPreview(dto.apiKey);

    await this.deactivateActive(organizationId);

    const record = this.repo.create({
      organizationId,
      provider: dto.provider,
      modelId: dto.modelId,
      apiKeyCiphertext: encrypted.ciphertext,
      apiKeyIv: encrypted.iv,
      apiKeyAuthTag: encrypted.authTag,
      keyPreview,
      label: dto.label ?? null,
      isActive: true,
    });
    await this.repo.save(record);

    return {
      provider: record.provider,
      modelId: record.modelId,
      keyPreview: record.keyPreview,
      label: record.label,
      hasCredential: true,
    };
  }

  async activate(organizationId: string, credentialId: string) {
    const credential = await this.repo.findOne({
      where: { id: credentialId, organizationId },
    });
    if (!credential) {
      throw new NotFoundException('Credential not found');
    }

    await this.deactivateActive(organizationId);

    credential.isActive = true;
    credential.updatedAt = new Date();
    await this.repo.save(credential);

    return {
      provider: credential.provider,
      modelId: credential.modelId,
      keyPreview: credential.keyPreview,
      label: credential.label,
      hasCredential: true,
    };
  }

  async remove(organizationId: string): Promise<void> {
    await this.deactivateActive(organizationId);
  }

  async removeById(organizationId: string, credentialId: string): Promise<void> {
    const result = await this.repo.delete({
      id: credentialId,
      organizationId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Credential not found');
    }
  }

  async getActiveDecrypted(
    organizationId: string,
  ): Promise<{ provider: string; modelId: string; apiKey: string } | null> {
    const active = await this.findActive(organizationId);
    if (!active) return null;

    const apiKey = this.crypto.decrypt({
      ciphertext: active.apiKeyCiphertext,
      iv: active.apiKeyIv,
      authTag: active.apiKeyAuthTag,
    });

    return { provider: active.provider, modelId: active.modelId, apiKey };
  }

  private async findActive(
    organizationId: string,
  ): Promise<AiCredentialEntity | null> {
    return this.repo.findOne({
      where: { organizationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async deactivateActive(organizationId: string): Promise<void> {
    await this.repo.update(
      { organizationId, isActive: true },
      { isActive: false, updatedAt: new Date() },
    );
  }

  private buildPreview(apiKey: string): string {
    const tail = apiKey.slice(-4);
    return `••••${tail}`;
  }
}

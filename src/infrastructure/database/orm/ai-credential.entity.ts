import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('organization_ai_credentials')
@Index('idx_org_ai_cred_organization_id', ['organizationId'])
export class AiCredentialEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'organization_id', length: 255 })
  organizationId: string;

  @Column({ length: 32 })
  provider: string;

  @Column({ name: 'model_id', length: 128 })
  modelId: string;

  @Column({ name: 'api_key_ciphertext', type: 'text' })
  apiKeyCiphertext: string;

  @Column({ name: 'api_key_iv', type: 'text' })
  apiKeyIv: string;

  @Column({ name: 'api_key_auth_tag', type: 'text' })
  apiKeyAuthTag: string;

  @Column({ name: 'key_preview', length: 8 })
  keyPreview: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  label: string | null;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}

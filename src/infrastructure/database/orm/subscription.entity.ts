import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

export enum SubscriptionFeature {
  JOB_POSTING = 'job_posting',
  CANDIDATE_SEARCH = 'candidate_search',
  ADVANCED_FILTERS = 'advanced_filters',
  ANALYTICS = 'analytics',
  BULK_MESSAGING = 'bulk_messaging',
  CUSTOM_BRANDING = 'custom_branding',
  PRIORITY_SUPPORT = 'priority_support',
}

export enum SubscriptionPlan {
  FREE = 'free',
  BASIC = 'basic',
  PREMIUM = 'premium',
  ENTERPRISE = 'enterprise',
}

@Entity('subscription')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  organization?: OrganizationEntity;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    nullable: false,
  })
  public planName: SubscriptionPlan;

  @Column({ type: 'timestamp', nullable: false })
  public startedAt: Date;

  @Column({ type: 'timestamp', nullable: false })
  public expiresAt: Date;

  @Column({ type: 'json', nullable: false })
  public features: SubscriptionFeature[];

  @Column({ default: true })
  public isActive: boolean;

  // Método de dominio útil
  public hasFeature(feature: SubscriptionFeature): boolean {
    return this.isActive && this.features.includes(feature);
  }
}

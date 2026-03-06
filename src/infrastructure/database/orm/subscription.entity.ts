import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

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

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  public organization: OrganizationEntity;

  @Column({ type: 'timestamp', nullable: false })
  public startedAt: Date;

  @Column({ type: 'timestamp', nullable: false })
  public expiresAt: Date;

  @Column({ type: 'json', nullable: false })
  public features: Record<string, boolean>;

  @Column({ default: true })
  public isActive: boolean;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    nullable: false,
  })
  public planName: SubscriptionPlan;
}

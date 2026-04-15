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

export enum PaymentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

@Entity('subscription')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ type: 'uuid', nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  public organization: OrganizationEntity;

  @Column({
    type: 'enum',
    enum: SubscriptionPlan,
    nullable: false,
  })
  public planName: SubscriptionPlan;

  @Column({ type: 'timestamp', nullable: false, name: 'startedAt' })
  public startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  public expiresAt: Date;

  @Column({ default: true })
  public isActive: boolean;

  @Column({ type: 'jsonb', nullable: false, default: '{}' })
  public features: Record<string, boolean>;

  // MercadoPago fields - using snake_case to match PostgreSQL columns
  @Column({ type: 'text', nullable: true, name: 'mercadopago_payment_id' })
  public mercadopagoPaymentId: string;

  @Column({ type: 'text', nullable: true, name: 'mercadopago_preference_id' })
  public mercadopagoPreferenceId: string;

  @Column({
    type: 'text',
    nullable: true,
    name: 'mercadopago_merchant_order_id',
  })
  public mercadopagoMerchantOrderId: string;

  @Column({ type: 'text', nullable: true, name: 'external_reference' })
  public externalReference: string;

  @Column({
    type: 'text',
    default: PaymentStatus.PENDING,
    name: 'payment_status',
  })
  public paymentStatus: PaymentStatus;

  @Column({ type: 'timestamptz', nullable: true, name: 'last_payment_at' })
  public lastPaymentAt: Date;

  @Column({ type: 'timestamp', nullable: false, name: 'created_at' })
  public createdAt: Date;

  @Column({ type: 'timestamp', nullable: false, name: 'updated_at' })
  public updatedAt: Date;
}

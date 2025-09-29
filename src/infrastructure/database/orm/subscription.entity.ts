import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';

@Entity('subscription')
export class SubscriptionEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  public organization: OrganizationEntity;

  @Column({ nullable: false })
  public planName: string;

  @Column({ type: 'timestamp', nullable: false })
  public startedAt: Date;

  @Column({ type: 'timestamp', nullable: false })
  public expiresAt: Date;

  @Column({ type: 'json', nullable: false })
  public features: string[];

  @Column({ default: true })
  public isActive: boolean;
}

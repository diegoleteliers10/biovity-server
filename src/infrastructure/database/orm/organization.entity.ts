import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { SubscriptionEntity } from './subscription.entity';
import { JobEntity } from './job.entity';
import { UserEntity } from './user.entity';
import { OrganizationMemberEntity } from './organization-member.entity';

@Entity('organization')
export class OrganizationEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public name: string;

  @Column({ nullable: false })
  public website: string;

  @Column({ nullable: true })
  public phone?: string;

  @Column({ type: 'json', nullable: true })
  public address?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
    zipCode?: string;
  };

  @Column({ nullable: true })
  public logo?: string;

  @Column({ nullable: true, type: 'text' })
  public description?: string;

  @Column({ nullable: true })
  public industry?: string;

  @Column({ nullable: true })
  public size?: string;

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();

  @Column({ type: 'jsonb', nullable: true })
  public integrations?: {
    slackWebhookUrl?: string;
    discordWebhookUrl?: string;
    enabled?: boolean;
  };

  @Column({ nullable: true, unique: true })
  public subscriptionId?: string;

  @OneToOne(() => SubscriptionEntity, { nullable: true })
  @JoinColumn({ name: 'subscriptionId' })
  public subscription?: SubscriptionEntity;

  @OneToMany(() => JobEntity, job => job.organization)
  public jobs: JobEntity[];

  @OneToMany(() => UserEntity, user => user.organization)
  public users: UserEntity[];

  @OneToMany(() => OrganizationMemberEntity, member => member.organization)
  public members: OrganizationMemberEntity[];
}

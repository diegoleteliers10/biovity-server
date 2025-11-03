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

  @OneToOne(() => SubscriptionEntity, { nullable: true, cascade: true })
  @JoinColumn()
  public subscription?: SubscriptionEntity;

  @OneToMany(() => JobEntity, job => job.organization)
  public jobs: JobEntity[];

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();
}

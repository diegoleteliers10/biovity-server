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
import { OrganizationEntity } from './organization.entity';
import { ResumeEntity } from './resume.entity';
import { ApplicationEntity } from './application.entity';
import { UserType } from '../../../core/domain/enums';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ unique: true, nullable: false })
  public email: string;

  @Column({ nullable: false })
  public name: string;

  @Column({
    type: 'enum',
    enum: UserType,
    nullable: false,
  })
  public type: UserType;

  @Column({ default: false })
  public isEmailVerified: boolean;

  @Column({ default: true })
  public isActive: boolean;

  @Column({ nullable: true })
  public verificationToken?: string;

  @Column({ nullable: true, unique: true })
  public organizationId?: string;

  @OneToOne(() => OrganizationEntity, { nullable: true })
  @JoinColumn({ name: 'organizationId' })
  public organization?: OrganizationEntity;

  @Column({ nullable: true })
  public avatar?: string;

  @Column({ nullable: true })
  public profession?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  public birthday?: string;

  @Column({ nullable: true })
  public phone?: string;

  @Column({ default: 0 })
  public profileViews: number;

  @Column({ type: 'jsonb', nullable: true })
  public location?: {
    city?: string;
    country?: string;
    street?: string;
  };

  @Column({ name: 'notification_preferences', type: 'jsonb', nullable: true })
  public notificationPreferences?: {
    digest?: 'none' | 'immediate' | 'daily' | 'weekly';
    channels?: {
      email?: boolean;
      in_app?: boolean;
    };
    events?: {
      application?: boolean;
      interview?: boolean;
      message?: boolean;
      job_alert?: boolean;
      system?: boolean;
    };
  };

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @UpdateDateColumn()
  public updatedAt: Date = new Date();

  @OneToMany(() => ResumeEntity, resume => resume.user)
  public resumes: ResumeEntity[];

  @OneToMany(() => ApplicationEntity, application => application.candidate)
  public applications: ApplicationEntity[];
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { ResumeEntity } from './resume.entity';
import { ApplicationEntity } from './application.entity';

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ unique: true, nullable: false })
  public email: string;

  @Column({ nullable: false })
  public name: string;

  @Column({ nullable: false })
  public password: string;

  @Column({
    type: 'enum',
    enum: ['organización', 'persona'],
    nullable: false,
  })
  public type: 'organización' | 'persona';

  @Column({ default: false })
  public isEmailVerified: boolean;

  @Column({ default: false })
  public isActive: boolean;

  @Column({ nullable: true })
  public verificationToken?: string;

  @OneToOne(() => OrganizationEntity, { nullable: true, cascade: true })
  @JoinColumn()
  public organization?: OrganizationEntity;

  @OneToMany(() => ResumeEntity, resume => resume.user)
  public resumes: ResumeEntity[];

  @OneToMany(() => ApplicationEntity, application => application.candidate)
  public applications: ApplicationEntity[];
}

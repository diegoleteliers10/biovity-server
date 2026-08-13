import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import {
  SalaryExperienceLevel,
  SalaryEducationLevel,
  SalaryWorkMode,
} from '../../../core/domain/enums';

@Entity('salary_submissions')
export class SalarySubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Index()
  @Column({ nullable: false })
  public profession: string;

  @Index()
  @Column({ nullable: false })
  public industry: string;

  @Column({ name: 'experience_years', type: 'int', nullable: false })
  public experienceYears: number;

  @Column({
    name: 'experience_level',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  public experienceLevel: SalaryExperienceLevel;

  @Column({
    name: 'education_level',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  public educationLevel: SalaryEducationLevel;

  @Index()
  @Column({ nullable: false })
  public region: string;

  @Column({
    name: 'work_mode',
    type: 'varchar',
    length: 20,
    nullable: false,
  })
  public workMode: SalaryWorkMode;

  @Column({ name: 'monthly_salary_clp', type: 'int', nullable: false })
  public monthlySalaryClp: number;

  @Column({
    name: 'annual_bonus_clp',
    type: 'int',
    nullable: false,
    default: 0,
  })
  public annualBonusClp: number;

  @Column({ type: 'simple-array', nullable: false, default: '' })
  public benefits: string[];

  @Column({ type: 'simple-array', nullable: false, default: '' })
  public skills: string[];

  @Column({ name: 'is_verified', default: false })
  public isVerified: boolean;

  @CreateDateColumn({ name: 'created_at' })
  public createdAt: Date = new Date();
}

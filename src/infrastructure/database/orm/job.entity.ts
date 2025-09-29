import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { OrganizationEntity } from './organization.entity';
import { ApplicationEntity } from './application.entity';

@Entity('job')
export class JobEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public organizationId: string;

  @ManyToOne(() => OrganizationEntity)
  @JoinColumn({ name: 'organizationId' })
  public organization: OrganizationEntity;

  @Column({ nullable: false })
  public title: string;

  @Column({ type: 'text', nullable: false })
  public description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: false })
  public amount: number;

  @Column({ nullable: false })
  public location: string;

  @Column({
    type: 'enum',
    enum: ['Full-time', 'Part-time', 'Contrato', 'Practica'],
    nullable: false,
  })
  public employmentType: 'Full-time' | 'Part-time' | 'Contrato' | 'Practica';

  @Column({
    type: 'enum',
    enum: ['Entrante', 'Junior', 'Mid-Senior', 'Senior', 'Ejecutivo'],
    nullable: false,
  })
  public experienceLevel:
    | 'Entrante'
    | 'Junior'
    | 'Mid-Senior'
    | 'Senior'
    | 'Ejecutivo';

  @Column({ type: 'json', default: '[]' })
  public benefits: {
    title: string;
    description?: string;
  }[];

  @OneToMany(() => ApplicationEntity, application => application.job)
  public applications: ApplicationEntity[];

  @CreateDateColumn()
  public createdAt: Date;

  @UpdateDateColumn()
  public updatedAt: Date;
}

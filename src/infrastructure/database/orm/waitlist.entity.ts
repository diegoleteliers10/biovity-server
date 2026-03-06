import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

export enum WaitlistRole {
  PROFESSIONAL = 'professional',
  ORGANIZATION = 'organization',
}

@Entity('waitlist')
export class WaitlistEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ unique: true, nullable: false })
  public email: string;

  @Column({
    type: 'enum',
    enum: WaitlistRole,
    nullable: false,
  })
  public role: WaitlistRole;

  @CreateDateColumn()
  public createdAt: Date = new Date();
}

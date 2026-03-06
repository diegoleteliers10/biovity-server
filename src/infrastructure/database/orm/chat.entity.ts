import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { UserEntity } from './user.entity';
import { MessageEntity } from './message.entity';

@Entity('chat')
export class ChatEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public recruiterId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'recruiterId' })
  public recruiter: UserEntity;

  @Column({ nullable: false })
  public professionalId: string;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'professionalId' })
  public professional: UserEntity;

  @Column({ nullable: true })
  public jobId?: string;

  @Column({ nullable: true })
  public lastMessage?: string;

  @Column({ default: 0 })
  public unreadCountRecruiter: number;

  @Column({ default: 0 })
  public unreadCountProfessional: number;

  @CreateDateColumn()
  public createdAt: Date = new Date();

  @Column({ type: 'timestamp', nullable: true })
  public updatedAt?: Date;

  @OneToMany(() => MessageEntity, message => message.chat)
  public messages: MessageEntity[];
}

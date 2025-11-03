import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('session')
export class SessionEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: false })
  public expiresAt: Date;

  @Column({ nullable: false, unique: true })
  public token: string;

  @Column({ name: 'user_id', nullable: false })
  public userId: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;

  @Column({ name: 'ip_address', nullable: true })
  public ipAddress?: string;

  @Column({ name: 'user_agent', nullable: true })
  public userAgent?: string;

  @Column({ name: 'customField', nullable: true })
  public customField?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  public createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  public updatedAt: Date = new Date();

  // Método de dominio para verificar si la sesión ha expirado
  public isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  // Método de dominio para verificar si la sesión está activa
  public isActive(): boolean {
    return !this.isExpired();
  }

  // Método de dominio para obtener el tiempo restante de la sesión en minutos
  public getTimeRemainingInMinutes(): number {
    if (this.isExpired()) return 0;

    const now = new Date();
    const diffInMs = this.expiresAt.getTime() - now.getTime();
    return Math.floor(diffInMs / (1000 * 60));
  }

  // Método de dominio para extender la sesión
  public extendSession(additionalHours: number): void {
    const extensionMs = additionalHours * 60 * 60 * 1000;
    this.expiresAt = new Date(this.expiresAt.getTime() + extensionMs);
    this.updatedAt = new Date();
  }
}

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

@Entity('account')
export class AccountEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ name: 'provideraccountid', nullable: false })
  public providerAccountId: string;

  @Column({ nullable: false })
  public provider: string;

  @Column({ name: 'user_id', nullable: false })
  public userId: string;

  @ManyToOne(() => UserEntity, { nullable: false })
  @JoinColumn({ name: 'user_id' })
  public user: UserEntity;

  @Column({ name: 'access_token', nullable: true })
  public accessToken?: string;

  @Column({ name: 'refresh_token', nullable: true })
  public refreshToken?: string;

  @Column({ name: 'idToken', nullable: true })
  public idToken?: string;

  @Column({ name: 'expires_at', type: 'timestamp with time zone', nullable: true })
  public expiresAt?: Date;

  @Column({ name: 'refreshTokenExpiresAt', type: 'timestamp with time zone', nullable: true })
  public refreshTokenExpiresAt?: Date;

  @Column({ nullable: true })
  public scope?: string;

  @Column({ nullable: true })
  public password?: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp with time zone' })
  public createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp with time zone' })
  public updatedAt: Date = new Date();

  // Método de dominio para verificar si el token ha expirado
  public isTokenExpired(): boolean {
    return this.expiresAt ? this.expiresAt <= new Date() : false;
  }

  // Método de dominio para verificar si el refresh token ha expirado
  public isRefreshTokenExpired(): boolean {
    return this.refreshTokenExpiresAt ? this.refreshTokenExpiresAt <= new Date() : false;
  }
}

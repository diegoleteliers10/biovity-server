import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('verification')
export class VerificationEntity {
  @PrimaryGeneratedColumn('uuid')
  public id: string;

  @Column({ nullable: false })
  public identifier: string; // email or phone number

  @Column({ nullable: false })
  public value: string; // verification code/token

  @Column({ name: 'expiresAt', type: 'timestamp with time zone', nullable: false })
  public expiresAt: Date;

  @CreateDateColumn({ name: 'createdAt', type: 'timestamp with time zone' })
  public createdAt: Date = new Date();

  @UpdateDateColumn({ name: 'updatedAt', type: 'timestamp with time zone' })
  public updatedAt: Date = new Date();

  // Método de dominio para verificar si el código ha expirado
  public isExpired(): boolean {
    return this.expiresAt <= new Date();
  }

  // Método de dominio para verificar si el código es válido
  public isValid(): boolean {
    return !this.isExpired();
  }

  // Método de dominio para verificar si el código coincide
  public matches(code: string): boolean {
    return this.value === code && this.isValid();
  }

  // Método de dominio para obtener el tiempo restante en minutos
  public getTimeRemainingInMinutes(): number {
    if (this.isExpired()) return 0;

    const now = new Date();
    const diffInMs = this.expiresAt.getTime() - now.getTime();
    return Math.floor(diffInMs / (1000 * 60));
  }

  // Método de dominio para verificar si el código expira pronto (próximos 2 minutos)
  public expiresSoon(): boolean {
    if (this.isExpired()) return false;

    const twoMinutesFromNow = new Date(Date.now() + 2 * 60 * 1000);
    return this.expiresAt <= twoMinutesFromNow;
  }

  // Método de dominio para generar un mensaje de estado
  public getStatusMessage(): string {
    if (this.isExpired()) {
      return 'Código expirado. Solicita uno nuevo.';
    }

    const remainingMinutes = this.getTimeRemainingInMinutes();
    if (remainingMinutes <= 2) {
      return `Código expira en ${remainingMinutes} minuto(s)`;
    }

    return 'Código válido';
  }
}

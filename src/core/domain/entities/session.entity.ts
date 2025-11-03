import type { User } from './user.entity';

export class Session {
  constructor(
    public id: string,
    public expiresAt: Date,
    public token: string,
    public userId: string,
    public ipAddress?: string,
    public userAgent?: string,
    public customField?: string,
    public user?: User,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

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

  // Método de dominio para verificar si la sesión expira pronto (próximos 30 minutos)
  public expiresSoon(): boolean {
    if (this.isExpired()) return false;

    const thirtyMinutesFromNow = new Date(Date.now() + 30 * 60 * 1000);
    return this.expiresAt <= thirtyMinutesFromNow;
  }

  // Método de dominio para extender la sesión
  public extendSession(additionalHours: number): void {
    const extensionMs = additionalHours * 60 * 60 * 1000;
    this.expiresAt = new Date(this.expiresAt.getTime() + extensionMs);
    this.updatedAt = new Date();
  }
}

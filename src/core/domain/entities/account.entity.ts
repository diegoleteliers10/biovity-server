import type { User } from './user.entity';

export class Account {
  constructor(
    public id: string,
    public providerAccountId: string,
    public provider: string,
    public userId: string,
    public accessToken?: string,
    public refreshToken?: string,
    public idToken?: string,
    public expiresAt?: Date,
    public refreshTokenExpiresAt?: Date,
    public scope?: string,
    public password?: string,
    public user?: User,
    public createdAt: Date = new Date(),
    public updatedAt: Date = new Date(),
  ) {}

  // Método de dominio para verificar si el token ha expirado
  public isTokenExpired(): boolean {
    return this.expiresAt ? this.expiresAt <= new Date() : false;
  }

  // Método de dominio para verificar si el refresh token ha expirado
  public isRefreshTokenExpired(): boolean {
    return this.refreshTokenExpiresAt ? this.refreshTokenExpiresAt <= new Date() : false;
  }

  // Método de dominio para verificar si necesita renovar el token
  public needsTokenRefresh(): boolean {
    if (!this.expiresAt) return false;

    // Renovar si el token expira en los próximos 5 minutos
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.expiresAt <= fiveMinutesFromNow;
  }
}

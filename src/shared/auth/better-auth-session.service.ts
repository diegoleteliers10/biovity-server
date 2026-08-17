import { Injectable } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { DataSource } from 'typeorm';

export interface AuthenticatedUser {
  id: string;
  type: string;
  organizationId: string | null;
}

/**
 * Validates Better Auth sessions against the shared Postgres database.
 *
 * Cookie format (better-call `signCookieValue`):
 *   `encodeURIComponent(`${token}.${base64(HMAC-SHA256(token, secret))}`)`
 * The session token is stored verbatim in the `session` table.
 */
@Injectable()
export class BetterAuthSessionService {
  constructor(private readonly dataSource: DataSource) {}

  async validateSessionCookie(
    cookieValue: string | undefined,
  ): Promise<AuthenticatedUser | null> {
    if (!cookieValue) return null;
    const token = this.extractSignedToken(cookieValue);
    if (!token) return null;
    return this.findActiveSession(token);
  }

  private extractSignedToken(cookieValue: string): string | null {
    const secret = process.env.BETTER_AUTH_SECRET;
    const lastDot = cookieValue.lastIndexOf('.');
    if (lastDot <= 0) return null;
    const token = cookieValue.slice(0, lastDot);
    const signature = cookieValue.slice(lastDot + 1);
    if (!secret) return token;
    const expected = createHmac('sha256', secret)
      .update(token)
      .digest('base64');
    const given = Buffer.from(signature);
    const wanted = Buffer.from(expected);
    if (given.length !== wanted.length || !timingSafeEqual(given, wanted)) {
      return null;
    }
    return token;
  }

  private async findActiveSession(
    token: string,
  ): Promise<AuthenticatedUser | null> {
    const rows: Array<{
      userId: string;
      type: string;
      isActive: boolean;
      organizationId: string | null;
    }> = await this.dataSource.query(
      `SELECT u."id" AS "userId", u."type", u."isActive", u."organizationId"
       FROM session s
       JOIN "user" u ON u."id" = s."user_id"
       WHERE s."token" = $1 AND s."expires_at" > NOW()
       LIMIT 1`,
      [token],
    );
    const row = rows[0];
    if (!row || row.isActive !== true) return null;
    return {
      id: row.userId,
      type: row.type,
      organizationId: row.organizationId ?? null,
    };
  }
}
